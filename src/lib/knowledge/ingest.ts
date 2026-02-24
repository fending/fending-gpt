import { generateText } from 'ai'
import { getAnthropicModel } from '@/lib/ai/models'
import { OpenAIEmbeddingService } from '@/lib/embeddings/openai'

const VALID_CATEGORIES = [
  'affiliations', 'experience', 'skills', 'projects',
  'education', 'personal', 'company'
] as const

type Category = typeof VALID_CATEGORIES[number]

interface IngestEntry {
  category: string
  title: string
  content: string
  tags: string[]
  priority: number
  source: string
  embedding: number[]
}

export interface IngestResult {
  entries: IngestEntry[]
  stats: {
    totalChunks: number
    categorized: number
    errors: string[]
  }
}

/**
 * Split text into paragraph-based chunks with merging and splitting rules.
 * Target chunk size: 100-800 chars.
 */
export function chunkText(text: string): string[] {
  // Split on double newlines (paragraph boundaries)
  const rawParagraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  // Merge very short paragraphs (<50 chars) with neighbors
  const merged: string[] = []
  let buffer = ''

  for (const paragraph of rawParagraphs) {
    if (buffer.length > 0 && buffer.length < 50) {
      // Merge short buffer with current paragraph
      buffer = buffer + '\n\n' + paragraph
    } else if (buffer.length > 0) {
      merged.push(buffer)
      buffer = paragraph
    } else {
      buffer = paragraph
    }
  }
  if (buffer.length > 0) {
    // If the trailing buffer is very short, merge with the last entry
    if (buffer.length < 50 && merged.length > 0) {
      merged[merged.length - 1] = merged[merged.length - 1] + '\n\n' + buffer
    } else {
      merged.push(buffer)
    }
  }

  // Split very long paragraphs (>1000 chars) at sentence boundaries
  const chunks: string[] = []
  for (const paragraph of merged) {
    if (paragraph.length > 1000) {
      const sentences = splitIntoSentences(paragraph)
      let current = ''

      for (const sentence of sentences) {
        if (current.length + sentence.length > 800 && current.length >= 100) {
          chunks.push(current.trim())
          current = sentence
        } else {
          current = current ? current + ' ' + sentence : sentence
        }
      }
      if (current.trim().length > 0) {
        // If trailing fragment is too short, merge with previous chunk
        if (current.trim().length < 100 && chunks.length > 0) {
          chunks[chunks.length - 1] = chunks[chunks.length - 1] + ' ' + current.trim()
        } else {
          chunks.push(current.trim())
        }
      }
    } else {
      chunks.push(paragraph)
    }
  }

  return chunks.filter(c => c.length > 0)
}

/**
 * Split a paragraph into sentences at common sentence boundaries.
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace
  const parts = text.split(/(?<=[.!?])\s+/)
  return parts.filter(s => s.trim().length > 0)
}

interface CategorizationResult {
  category: Category
  title: string
  tags: string[]
}

/**
 * Categorize a single chunk using Claude Haiku.
 */
async function categorizeChunk(chunk: string): Promise<CategorizationResult> {
  const { text } = await generateText({
    model: getAnthropicModel('haiku'),
    system: 'Categorize the following text about a person\'s professional background into exactly one of these categories: affiliations, experience, skills, projects, education, personal, company. Also extract a short title (max 60 chars) and up to 5 relevant tags. Respond with JSON only: {"category": "...", "title": "...", "tags": ["..."]}',
    prompt: chunk,
    maxOutputTokens: 200,
    temperature: 0,
  })

  // Parse JSON from response, stripping any markdown fencing
  const cleaned = text.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim()
  const parsed = JSON.parse(cleaned)

  // Validate category
  const category = VALID_CATEGORIES.includes(parsed.category)
    ? parsed.category as Category
    : 'experience'

  // Validate title length
  const title = typeof parsed.title === 'string'
    ? parsed.title.slice(0, 60)
    : chunk.slice(0, 60)

  // Validate tags
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.filter((t: unknown) => typeof t === 'string').slice(0, 5)
    : []

  return { category, title, tags }
}

/**
 * Process chunks in batches with delay to avoid rate limits.
 */
async function categorizeBatch(
  chunks: string[],
  batchSize: number = 5,
  delayMs: number = 200
): Promise<{ results: (CategorizationResult & { index: number })[]; errors: string[] }> {
  const results: (CategorizationResult & { index: number })[] = []
  const errors: string[] = []

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)

    const batchResults = await Promise.allSettled(
      batch.map((chunk, batchIndex) =>
        categorizeChunk(chunk).then(result => ({
          ...result,
          index: i + batchIndex,
        }))
      )
    )

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j]
      const chunkIndex = i + j

      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        const errorMsg = `Chunk ${chunkIndex + 1}: ${result.reason?.message || 'Unknown error'}`
        errors.push(errorMsg)
        // Fallback: use "experience" category with first 60 chars as title
        results.push({
          category: 'experience',
          title: chunks[chunkIndex].slice(0, 60),
          tags: [],
          index: chunkIndex,
        })
      }
    }

    // Delay between batches (skip after last batch)
    if (i + batchSize < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return { results, errors }
}

/**
 * Full document ingestion pipeline.
 * Chunks text, categorizes with Haiku, generates embeddings, returns structured entries.
 */
export async function ingestDocument(
  text: string,
  options: {
    source?: string
    defaultPriority?: number
  } = {}
): Promise<IngestResult> {
  const source = options.source || 'document'
  const defaultPriority = options.defaultPriority || 3
  const errors: string[] = []

  // Step 1: Chunk the text
  const chunks = chunkText(text)

  if (chunks.length === 0) {
    return {
      entries: [],
      stats: { totalChunks: 0, categorized: 0, errors: ['No content to process after chunking'] },
    }
  }

  // Step 2: Categorize each chunk with Claude Haiku
  const { results: categorized, errors: catErrors } = await categorizeBatch(chunks)
  errors.push(...catErrors)

  // Step 3: Generate embeddings for all chunks
  const embeddingService = new OpenAIEmbeddingService()
  const formattedTexts = categorized.map(cat => {
    return embeddingService.formatKnowledgeEntry({
      category: cat.category,
      title: cat.title,
      content: chunks[cat.index],
      tags: cat.tags,
    })
  })

  let embeddings: number[][] = []
  try {
    embeddings = await embeddingService.generateEmbeddings(formattedTexts)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown embedding error'
    errors.push(`Embedding generation failed: ${msg}`)
    // Fill with empty arrays so entries can still be created without embeddings
    embeddings = new Array(categorized.length).fill([])
  }

  // Step 4: Build structured entries
  const entries: IngestEntry[] = categorized.map((cat, i) => ({
    category: cat.category,
    title: cat.title,
    content: chunks[cat.index],
    tags: cat.tags,
    priority: defaultPriority,
    source,
    embedding: embeddings[i] || [],
  }))

  return {
    entries,
    stats: {
      totalChunks: chunks.length,
      categorized: categorized.length,
      errors,
    },
  }
}

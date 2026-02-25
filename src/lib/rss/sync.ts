import { createClient } from '@supabase/supabase-js'
import { OpenAIEmbeddingService } from '@/lib/embeddings/openai'

interface RSSArticle {
  title: string
  link: string
  slug: string
  description: string
  pubDate: string
}

interface SyncResult {
  fetched: number
  existing: number
  inserted: number
  failed: number
  articles: { title: string; status: 'inserted' | 'skipped' | 'failed' }[]
}

/**
 * Extract article slug from a URL like https://brianfending.com/articles/some-slug
 */
function extractSlug(url: string): string {
  const match = url.match(/\/articles\/([^/?#]+)/)
  return match?.[1] ?? ''
}

/**
 * Parse RSS XML into article objects.
 * Minimal parser — no external dependencies.
 */
function parseRSS(xml: string): RSSArticle[] {
  const articles: RSSArticle[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1]
    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      ?? item.match(/<title>(.*?)<\/title>/)?.[1]
      ?? ''
    const link = item.match(/<link>(.*?)<\/link>/)?.[1] ?? ''
    const description = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1]
      ?? item.match(/<description>([\s\S]*?)<\/description>/)?.[1]
      ?? ''
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? ''

    if (title && link) {
      articles.push({
        title: title.trim(),
        link: link.trim(),
        slug: extractSlug(link.trim()),
        description: cleanHTML(description.trim()),
        pubDate: pubDate.trim(),
      })
    }
  }

  return articles
}

/**
 * Strip HTML tags and decode common entities
 */
function cleanHTML(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Derive tags from article title and description
 */
function deriveTags(article: RSSArticle): string[] {
  const tags = ['article']
  const text = `${article.title} ${article.description}`.toLowerCase()

  const tagMap: Record<string, string[]> = {
    'ai-governance': ['ai governance', 'ai risk', 'nist ai rmf', 'responsible ai'],
    'cybersecurity': ['cybersecurity', 'security problem', 'security risk', 'cyber insurance'],
    'shadow-ai': ['shadow ai', 'shadow it'],
    'nist': ['nist'],
    'ai-rmf': ['ai rmf', 'ai rms'],
    'mcp': ['model context protocol', 'mcp'],
    'risk-management': ['risk management', 'risk analysis', 'grc'],
    'enterprise': ['enterprise', 'organization'],
    'ai-strategy': ['agi', 'llm scaling', 'ai strategy'],
    'writing': ['writing', 'editorial', 'bias'],
    'consulting': ['consulting', 'practice', 'assessment'],
    'team-topologies': ['team topolog', 'team structure'],
    'drp': ['disaster recovery', 'drp'],
    'bcp': ['business continuity', 'bcp'],
  }

  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      tags.push(tag)
    }
  }

  return tags
}

/**
 * Build KB content from an RSS article.
 * Uses the RSS description with attribution URL.
 */
function buildKBContent(article: RSSArticle): string {
  const date = article.pubDate
    ? new Date(article.pubDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : ''
  const dateStr = date ? ` Published ${date}` : ''
  const desc = article.description || article.title
  return `Brian wrote this article: ${desc}${dateStr} at ${article.link}.`
}

/**
 * Sync RSS feed articles into the RAG knowledge base.
 * Fetches the feed, diffs against existing entries, inserts new ones with embeddings.
 */
export async function syncRSSToKnowledgeBase(
  feedUrl = 'https://brianfending.com/articles/feed.xml'
): Promise<SyncResult> {
  const result: SyncResult = {
    fetched: 0,
    existing: 0,
    inserted: 0,
    failed: 0,
    articles: [],
  }

  // Fetch RSS feed
  const response = await fetch(feedUrl, { next: { revalidate: 0 } })
  if (!response.ok) {
    throw new Error(`RSS fetch failed: ${response.status} ${response.statusText}`)
  }
  const xml = await response.text()
  const feedArticles = parseRSS(xml)
  result.fetched = feedArticles.length

  if (feedArticles.length === 0) {
    return result
  }

  // Get existing article entries from KB
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: existingEntries, error: fetchError } = await supabase
    .from('knowledge_base')
    .select('id, title, content')
    .eq('category', 'projects')
    .eq('is_active', true)
    .like('title', 'Article:%')

  if (fetchError) {
    throw new Error(`Failed to fetch existing entries: ${fetchError.message}`)
  }

  // Build set of existing article slugs from content URLs
  const existingSlugs = new Set<string>()
  for (const entry of existingEntries ?? []) {
    const slugMatch = entry.content.match(/brianfending\.com\/articles\/([a-z0-9-]+)/)
    if (slugMatch) {
      existingSlugs.add(slugMatch[1])
    }
  }

  // Find new articles
  const newArticles = feedArticles.filter(a => {
    if (existingSlugs.has(a.slug)) {
      result.existing++
      result.articles.push({ title: a.title, status: 'skipped' })
      return false
    }
    return true
  })

  if (newArticles.length === 0) {
    return result
  }

  // Insert new articles with embeddings
  const embeddingService = new OpenAIEmbeddingService()

  for (const article of newArticles) {
    try {
      const content = buildKBContent(article)
      const tags = deriveTags(article)
      const entry = {
        category: 'projects' as const,
        title: `Article: ${article.title}`,
        content,
        tags,
      }

      // Generate embedding
      let embedding: number[] | null = null
      try {
        const entryText = embeddingService.formatKnowledgeEntry(entry)
        embedding = await embeddingService.generateEmbedding(entryText)
      } catch (embeddingError) {
        console.error(`Failed to generate embedding for "${article.title}":`, embeddingError)
      }

      const { error: insertError } = await supabase
        .from('knowledge_base')
        .insert({
          ...entry,
          priority: 3,
          source: 'rss-sync',
          is_active: true,
          confidence: 1.0,
          embedding,
        })

      if (insertError) {
        throw insertError
      }

      result.inserted++
      result.articles.push({ title: article.title, status: 'inserted' })
      console.log(`Inserted article: ${article.title}`)
    } catch (error) {
      result.failed++
      result.articles.push({ title: article.title, status: 'failed' })
      console.error(`Failed to insert article "${article.title}":`, error)
    }
  }

  return result
}

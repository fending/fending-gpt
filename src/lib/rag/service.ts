import { createClient } from '@/lib/supabase/server'
import { OpenAIEmbeddingService } from '@/lib/embeddings/openai'

export interface KnowledgeEntry {
  id: string
  category: string
  title: string
  content: string
  tags: string[] | null
  priority: number
  similarity?: number
}

export interface RAGResult {
  entries: KnowledgeEntry[]
  totalRetrieved: number
  query: string
}

export class RAGService {
  private embeddingService: OpenAIEmbeddingService

  constructor() {
    this.embeddingService = new OpenAIEmbeddingService()
  }

  /**
   * Retrieve relevant knowledge entries using vector similarity search
   */
  async queryKnowledge(
    userQuery: string, 
    options: {
      maxResults?: number
      similarityThreshold?: number
      ensureCategoryDiversity?: boolean
    } = {}
  ): Promise<RAGResult> {
    const {
      maxResults = 15,
      similarityThreshold = 0.7,
      ensureCategoryDiversity = true
    } = options

    try {
      // Generate embedding for user query
      const queryEmbedding = await this.embeddingService.generateEmbedding(userQuery)
      
      const supabase = await createClient()

      // Perform vector similarity search
      const { data: similarEntries, error } = await supabase.rpc(
        'match_knowledge_entries',
        {
          query_embedding: queryEmbedding,
          match_threshold: similarityThreshold,
          match_count: maxResults * 2 // Get more to allow for rebalancing
        }
      )

      if (error) {
        console.error('Vector search error:', error)
        throw new Error('Failed to perform vector search')
      }

      let results = similarEntries || []

      // Apply category diversity if requested
      if (ensureCategoryDiversity && results.length > 0) {
        results = this.balanceByCategory(results, maxResults)
      } else {
        results = results.slice(0, maxResults)
      }

      return {
        entries: results,
        totalRetrieved: results.length,
        query: userQuery
      }

    } catch (error) {
      console.error('RAG query failed:', error)
      
      // Fallback to priority-based retrieval
      console.log('Falling back to priority-based knowledge retrieval')
      return this.fallbackQuery(maxResults)
    }
  }

  /**
   * Balance results to ensure category diversity
   */
  private balanceByCategory(entries: KnowledgeEntry[], maxResults: number): KnowledgeEntry[] {
    const categories = ['experience', 'skills', 'education', 'projects', 'company', 'affiliations', 'personal']
    const balanced: KnowledgeEntry[] = []
    const entriesByCategory = new Map<string, KnowledgeEntry[]>()

    // Group entries by category
    entries.forEach(entry => {
      if (!entriesByCategory.has(entry.category)) {
        entriesByCategory.set(entry.category, [])
      }
      entriesByCategory.get(entry.category)!.push(entry)
    })

    // Sort categories by whether they have relevant entries (high similarity)
    const sortedCategories = categories.sort((a, b) => {
      const aEntries = entriesByCategory.get(a) || []
      const bEntries = entriesByCategory.get(b) || []
      const aMaxSimilarity = Math.max(...aEntries.map(e => e.similarity || 0))
      const bMaxSimilarity = Math.max(...bEntries.map(e => e.similarity || 0))
      return bMaxSimilarity - aMaxSimilarity
    })

    // Take top entries from each category, prioritizing high-similarity categories
    const slotsPerCategory = Math.floor(maxResults / categories.length)
    let remainingSlots = maxResults - (slotsPerCategory * categories.length)

    for (const category of sortedCategories) {
      const categoryEntries = entriesByCategory.get(category) || []
      const slots = slotsPerCategory + (remainingSlots > 0 ? 1 : 0)
      if (remainingSlots > 0) remainingSlots--

      const topEntries = categoryEntries
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, slots)
      
      balanced.push(...topEntries)
    }

    // Fill any remaining slots with highest similarity entries
    if (balanced.length < maxResults) {
      const remaining = entries
        .filter(entry => !balanced.find(b => b.id === entry.id))
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, maxResults - balanced.length)
      
      balanced.push(...remaining)
    }

    return balanced.slice(0, maxResults)
  }

  /**
   * Fallback to priority-based retrieval if vector search fails
   */
  private async fallbackQuery(maxResults: number): Promise<RAGResult> {
    try {
      const supabase = await createClient()
      
      const { data: entries, error } = await supabase
        .from('knowledge_base')
        .select('id, category, title, content, tags, priority')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(maxResults)

      if (error) throw error

      return {
        entries: entries || [],
        totalRetrieved: entries?.length || 0,
        query: 'fallback'
      }
    } catch (error) {
      console.error('Fallback query failed:', error)
      return {
        entries: [],
        totalRetrieved: 0,
        query: 'fallback-failed'
      }
    }
  }

  /**
   * Build context string for LLM from RAG results
   */
  buildContext(ragResult: RAGResult): string {
    if (ragResult.entries.length === 0) {
      return 'Loading Brian\'s information...'
    }

    return ragResult.entries
      .map(entry => `${entry.category.toUpperCase()}: ${entry.content}`)
      .join('\n\n')
  }
}
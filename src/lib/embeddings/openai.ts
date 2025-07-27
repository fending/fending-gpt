import OpenAI from 'openai'

export class OpenAIEmbeddingService {
  private client: OpenAI
  private model = 'text-embedding-3-small'

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text.replace(/\n/g, ' '), // Clean text
      })

      return response.data[0].embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw new Error('Failed to generate embedding')
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts.map(text => text.replace(/\n/g, ' ')),
      })

      return response.data.map(item => item.embedding)
    } catch (error) {
      console.error('Error generating embeddings:', error)
      throw new Error('Failed to generate embeddings')
    }
  }

  /**
   * Format knowledge base entry for embedding
   */
  formatKnowledgeEntry(entry: {
    category: string
    title: string
    content: string
    tags?: string[]
  }): string {
    const tags = entry.tags?.join(', ') || ''
    return `Category: ${entry.category}
Title: ${entry.title}
Content: ${entry.content}
Tags: ${tags}`.trim()
  }

  /**
   * Estimate token count for cost calculation
   */
  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4)
  }

  /**
   * Calculate embedding cost
   */
  calculateCost(tokenCount: number): number {
    // OpenAI text-embedding-3-small pricing: $0.00002 per 1K tokens
    return (tokenCount / 1000) * 0.00002
  }
}
import Anthropic from '@anthropic-ai/sdk'
import { AIProvider, ChatMessage, AIResponse, GenerationOptions } from '../types'

export class ClaudeProvider implements AIProvider {
  name = 'claude'
  model = 'claude-3-5-sonnet-20241022'
  maxTokens = 200000
  costPerToken = {
    input: 0.003,   // $3 per 1M tokens
    output: 0.015,  // $15 per 1M tokens
  }

  private client: Anthropic

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.CLAUDE_API_KEY!,
    })
  }

  async generateResponse(
    messages: ChatMessage[],
    options?: GenerationOptions
  ): Promise<AIResponse> {
    const startTime = Date.now()
    
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens || 4000,
        temperature: options?.temperature || 0.7,
        system: options?.systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        stop_sequences: options?.stopSequences,
      })

      const responseTime = Date.now() - startTime
      const content = response.content[0]
      
      if (content.type !== 'text') {
        throw new Error('Unexpected response format from Claude')
      }

      const inputTokens = response.usage.input_tokens
      const outputTokens = response.usage.output_tokens
      const totalTokens = inputTokens + outputTokens
      const costUsd = this.calculateCost(inputTokens, outputTokens)
      
      // Calculate confidence score based on response characteristics
      const confidenceScore = this.calculateConfidenceScore(content.text, responseTime)

      return {
        response: content.text,
        tokensUsed: totalTokens,
        inputTokens,
        outputTokens,
        costUsd,
        confidenceScore,
        responseTimeMs: responseTime,
        metadata: {
          model: this.model,
          provider: this.name,
          usage: response.usage,
        }
      }
    } catch (error) {
      console.error('Error calling Claude API:', error)
      throw error
    }
  }

  async *generateStreamingResponse(
    messages: ChatMessage[],
    options?: GenerationOptions
  ): AsyncGenerator<string, AIResponse> {
    const startTime = Date.now()
    let fullResponse = ''
    
    try {
      const stream = await this.client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens || 4000,
        temperature: options?.temperature || 0.7,
        system: options?.systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        stop_sequences: options?.stopSequences,
        stream: true,
      })

      let inputTokens = 0
      let outputTokens = 0

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const text = chunk.delta.text
          fullResponse += text
          yield text
        } else if (chunk.type === 'message_start') {
          inputTokens = chunk.message.usage.input_tokens
        } else if (chunk.type === 'message_delta') {
          outputTokens = chunk.usage.output_tokens
        }
      }

      const responseTime = Date.now() - startTime
      const totalTokens = inputTokens + outputTokens
      const costUsd = this.calculateCost(inputTokens, outputTokens)
      const confidenceScore = this.calculateConfidenceScore(fullResponse, responseTime)

      return {
        response: fullResponse,
        tokensUsed: totalTokens,
        inputTokens,
        outputTokens,
        costUsd,
        confidenceScore,
        responseTimeMs: responseTime,
        metadata: {
          model: this.model,
          provider: this.name,
        }
      }
    } catch (error) {
      console.error('Error calling Claude streaming API:', error)
      throw error
    }
  }

  async estimateCost(messages: ChatMessage[]): Promise<number> {
    // Rough estimation: ~4 characters per token
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0)
    const estimatedTokens = Math.ceil(totalChars / 4)
    
    // Assume 50/50 split for input/output for estimation
    const estimatedInputTokens = estimatedTokens * 0.7
    const estimatedOutputTokens = estimatedTokens * 0.3
    
    return this.calculateCost(estimatedInputTokens, estimatedOutputTokens)
  }

  validateConfig(): boolean {
    return !!(process.env.CLAUDE_API_KEY || this.client.apiKey)
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check with minimal token usage
      await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      })
      return true
    } catch {
      return false
    }
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1000) * this.costPerToken.input
    const outputCost = (outputTokens / 1000) * this.costPerToken.output
    return inputCost + outputCost
  }

  private calculateConfidenceScore(
    response: string, 
    responseTime: number
  ): number {
    let confidence = 0.8 // Base confidence

    // Adjust based on response characteristics
    if (response.includes("I don't know") || response.includes("I'm not sure")) {
      confidence -= 0.2
    }
    
    if (response.includes("I don't have information about")) {
      confidence -= 0.3
    }

    // Very short responses might be less confident
    if (response.length < 50) {
      confidence -= 0.1
    }

    // Very long response times might indicate uncertainty
    if (responseTime > 10000) { // 10 seconds
      confidence -= 0.1
    }

    // Responses with hedging language
    const hedgingWords = ['maybe', 'perhaps', 'possibly', 'might', 'could be']
    const hedgingCount = hedgingWords.filter(word => 
      response.toLowerCase().includes(word)
    ).length
    
    confidence -= hedgingCount * 0.05

    // Ensure confidence stays within bounds
    return Math.max(0.1, Math.min(1.0, confidence))
  }
}
// AI Provider Abstraction Types
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  response: string
  tokensUsed: number
  inputTokens: number
  outputTokens: number
  costUsd: number
  confidenceScore?: number // 0.0 to 1.0
  responseTimeMs: number
  metadata?: Record<string, unknown>
}

export interface GenerationOptions {
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
  stopSequences?: string[]
}

export interface ProviderConfig {
  apiKey?: string
  model?: string
  baseUrl?: string
  maxTokens?: number
  [key: string]: unknown
}

export interface CostCalculation {
  inputCostPer1K: number
  outputCostPer1K: number
  totalCost: number
}

export interface AIProvider {
  name: string
  model: string
  maxTokens: number
  costPerToken: {
    input: number  // Cost per 1000 tokens
    output: number // Cost per 1000 tokens
  }
  
  // Core methods
  generateResponse(
    messages: ChatMessage[],
    options?: GenerationOptions
  ): Promise<AIResponse>
  
  estimateCost(messages: ChatMessage[]): Promise<number>
  
  validateConfig(): boolean
  
  // Health check
  isHealthy(): Promise<boolean>
}

export type ProviderType = 'claude' | 'openai' | 'local'

export interface ProviderMetrics {
  totalRequests: number
  totalTokens: number
  totalCost: number
  averageResponseTime: number
  averageConfidence: number
  errorRate: number
  lastUsed: Date
}
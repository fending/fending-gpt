export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface CompletionMetadata {
  tokensUsed: number
  inputTokens: number
  outputTokens: number
  costUsd: number
  confidenceScore: number
  responseTimeMs: number
  modelId: string
  modelType: string
}

export type ProviderType = 'claude' | 'openai' | 'local'

export interface ProviderConfig {
  apiKey?: string
}

export interface GenerationOptions {
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
  stopSequences?: string[]
}

export interface AIResponse {
  response: string
  tokensUsed: number
  inputTokens: number
  outputTokens: number
  costUsd: number
  confidenceScore: number
  responseTimeMs: number
  metadata: Record<string, unknown>
}

export interface AIProvider {
  name: string
  model: string
  maxTokens: number
  costPerToken: {
    input: number
    output: number
  }
  generateResponse(messages: ChatMessage[], options?: GenerationOptions): Promise<AIResponse>
  generateStreamingResponse(messages: ChatMessage[], options?: GenerationOptions): AsyncGenerator<string, AIResponse>
  estimateCost(messages: ChatMessage[]): Promise<number>
  validateConfig(): boolean
  isHealthy(): Promise<boolean>
}

export interface ProviderMetrics {
  totalRequests: number
  totalTokens: number
  totalCost: number
  averageResponseTime: number
  averageConfidence: number
  errorRate: number
  lastUsed: Date
}

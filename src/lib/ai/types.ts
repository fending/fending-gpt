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

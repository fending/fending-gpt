import { Tables } from './database'

export type User = Tables<'users'>
export type Conversation = Tables<'conversations'>
export type Message = Tables<'messages'>
export type UsageLog = Tables<'usage_logs'>

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  tokensUsed?: number
  costUsd?: number
  confidenceScore?: number
  responseTimeMs?: number
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[]
}

export interface AdminStats {
  totalUsers: number
  totalConversations: number
  totalMessages: number
  totalTokensUsed: number
  totalCostUSD: number
  dailyStats: {
    date: string
    users: number
    conversations: number
    messages: number
    tokens: number
    cost: number
  }[]
}

export interface UserUsageStats {
  totalConversations: number
  totalMessages: number
  totalTokensUsed: number
  totalCostUSD: number
  recentActivity: {
    date: string
    conversations: number
    messages: number
    tokens: number
  }[]
}

// AI Provider Types
export interface AIProviderInfo {
  name: string
  model: string
  maxTokens: number
  costPerToken: {
    input: number
    output: number
  }
}

export interface AIResponse {
  response: string
  tokensUsed: number
  costUsd: number
  confidenceScore?: number
  responseTimeMs: number
  provider?: AIProviderInfo
}
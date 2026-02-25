import { createAnthropic } from '@ai-sdk/anthropic'
import type { LanguageModel } from 'ai'

export type ModelType = 'sonnet' | 'haiku'

interface ModelConfig {
  modelId: string
  costPerToken: {
    input: number
    output: number
  }
}

export const MODEL_CONFIGS: Record<ModelType, ModelConfig> = {
  sonnet: {
    modelId: 'claude-sonnet-4-6',
    costPerToken: {
      input: 0.003,   // $3 per 1M tokens
      output: 0.015,  // $15 per 1M tokens
    },
  },
  haiku: {
    modelId: 'claude-haiku-4-5-20251001',
    costPerToken: {
      input: 0.0008,  // $0.80 per 1M tokens
      output: 0.004,  // $4 per 1M tokens
    },
  },
}

const anthropicClient = createAnthropic({
  apiKey: process.env.CLAUDE_API_KEY!,
})

export function getAnthropicModel(modelType: ModelType = 'sonnet'): LanguageModel {
  return anthropicClient(MODEL_CONFIGS[modelType].modelId)
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  modelType: ModelType = 'sonnet'
): number {
  const config = MODEL_CONFIGS[modelType]
  return (
    (inputTokens / 1000) * config.costPerToken.input +
    (outputTokens / 1000) * config.costPerToken.output
  )
}

export function calculateConfidence(response: string, responseTimeMs: number): number {
  let confidence = 0.8

  if (response.includes("I don't know") || response.includes("I'm not sure")) {
    confidence -= 0.2
  }
  if (response.includes("I don't have information about")) {
    confidence -= 0.3
  }
  if (response.length < 50) {
    confidence -= 0.1
  }
  if (responseTimeMs > 10000) {
    confidence -= 0.1
  }

  const hedgingWords = ['maybe', 'perhaps', 'possibly', 'might', 'could be']
  const hedgingCount = hedgingWords.filter(word =>
    response.toLowerCase().includes(word)
  ).length
  confidence -= hedgingCount * 0.05

  return Math.max(0.1, Math.min(1.0, confidence))
}

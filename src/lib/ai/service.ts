import { AIProviderFactory } from './factory'
import { AIProvider, ChatMessage, AIResponse, GenerationOptions, ProviderType } from './types'

export class AIService {
  private provider: AIProvider
  private instanceId: string

  constructor(
    providerType: ProviderType = 'claude',
    instanceId: string = 'default'
  ) {
    this.instanceId = `${providerType}-${instanceId}`
    this.provider = AIProviderFactory.create(providerType, undefined, this.instanceId)
  }

  async generateResponse(
    messages: ChatMessage[],
    options?: GenerationOptions
  ): Promise<AIResponse> {
    try {
      const response = await this.provider.generateResponse(messages, options)
      
      // Update metrics
      AIProviderFactory.updateMetrics(this.instanceId, response, false)
      
      return response
    } catch (error) {
      // Update error metrics
      AIProviderFactory.updateMetrics(this.instanceId, {
        tokensUsed: 0,
        costUsd: 0,
        responseTimeMs: 0,
      }, true)
      
      throw error
    }
  }

  async estimateCost(messages: ChatMessage[]): Promise<number> {
    return this.provider.estimateCost(messages)
  }

  async isHealthy(): Promise<boolean> {
    return this.provider.isHealthy()
  }

  getProvider(): AIProvider {
    return this.provider
  }

  getProviderInfo() {
    return {
      name: this.provider.name,
      model: this.provider.model,
      maxTokens: this.provider.maxTokens,
      costPerToken: this.provider.costPerToken,
    }
  }

  getMetrics() {
    return AIProviderFactory.getMetrics(this.instanceId)
  }

  // Static methods for easy access
  static async createWithFallback(
    preferredType: ProviderType = 'claude',
    fallbackTypes: ProviderType[] = []
  ): Promise<AIService> {
    const provider = await AIProviderFactory.getHealthyProvider(preferredType, fallbackTypes)
    const service = new AIService(preferredType)
    service.provider = provider
    return service
  }

  static getGlobalMetrics() {
    return AIProviderFactory.getMetrics()
  }

  static async compareProviders(testMessage?: string) {
    return AIProviderFactory.compareProviders(['claude'], testMessage)
  }
}

// Convenience function for backward compatibility
export async function sendMessageToAI(
  messages: ChatMessage[],
  systemPrompt?: string,
  options?: Partial<GenerationOptions>
): Promise<AIResponse> {
  const service = new AIService()
  return service.generateResponse(messages, {
    systemPrompt,
    ...options,
  })
}

// Export types for use in other modules
export * from './types'
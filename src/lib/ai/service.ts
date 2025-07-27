import { AIProviderFactory } from './factory'
import { AIProvider, ChatMessage, AIResponse, GenerationOptions, ProviderType } from './types'
import { analyzeQueryComplexity } from './query-analyzer'

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

  /**
   * Generate response with smart model selection based on query complexity
   */
  async generateSmartResponse(
    messages: ChatMessage[],
    options?: GenerationOptions
  ): Promise<AIResponse & { modelAnalysis?: { queryComplexity: string; recommendedModel: string; confidence: number; reasoning: string[]; modelUsed: string } }> {
    // Get the latest user message for analysis
    const latestMessage = messages[messages.length - 1]
    if (!latestMessage || latestMessage.role !== 'user') {
      // Fallback to default if no user message
      return this.generateResponse(messages, options)
    }

    // Analyze query complexity
    const analysis = analyzeQueryComplexity(latestMessage.content)
    const recommendedModel = analysis.recommendedModel
    
    console.log(`🧠 Query analysis: ${analysis.complexity} (${analysis.confidence.toFixed(2)} confidence)`)
    console.log(`📊 Recommended model: ${recommendedModel}`)
    console.log(`💭 Reasoning: ${analysis.reasoning.join(', ')}`)

    try {
      // Create provider with recommended model
      const smartProvider = AIProviderFactory.create('claude', undefined, `smart-${recommendedModel}`, recommendedModel)
      const smartInstanceId = `claude-smart-${recommendedModel}`

      const response = await smartProvider.generateResponse(messages, options)
      
      // Update metrics for the smart provider
      AIProviderFactory.updateMetrics(smartInstanceId, response, false)
      
      // Add analysis info to response
      return {
        ...response,
        modelAnalysis: {
          queryComplexity: analysis.complexity,
          recommendedModel,
          confidence: analysis.confidence,
          reasoning: analysis.reasoning,
          modelUsed: recommendedModel
        }
      }
    } catch {
      console.warn(`Smart model ${recommendedModel} failed, falling back to default`)
      // Fallback to default provider on error
      return this.generateResponse(messages, options)
    }
  }

  /**
   * Generate streaming response with smart model selection
   */
  async *generateSmartStreamingResponse(
    messages: ChatMessage[],
    options?: GenerationOptions
  ): AsyncGenerator<string, AIResponse & { modelAnalysis?: { queryComplexity: string; recommendedModel: string; confidence: number; reasoning: string[]; modelUsed: string } }> {
    // Get the latest user message for analysis
    const latestMessage = messages[messages.length - 1]
    if (!latestMessage || latestMessage.role !== 'user') {
      // Fallback to default provider streaming
      const provider = this.getProvider()
      if (provider.generateStreamingResponse) {
        return yield* provider.generateStreamingResponse(messages, options)
      }
      throw new Error('Streaming not supported by provider')
    }

    // Analyze query complexity
    const analysis = analyzeQueryComplexity(latestMessage.content)
    const recommendedModel = analysis.recommendedModel
    
    console.log(`🧠 Streaming query analysis: ${analysis.complexity} (${analysis.confidence.toFixed(2)} confidence)`)
    console.log(`📊 Recommended model: ${recommendedModel}`)

    try {
      // Create provider with recommended model
      const smartProvider = AIProviderFactory.create('claude', undefined, `smart-${recommendedModel}`, recommendedModel)
      const smartInstanceId = `claude-smart-${recommendedModel}`

      if (!smartProvider.generateStreamingResponse) {
        throw new Error('Smart provider does not support streaming')
      }

      // Stream the response
      for await (const chunk of smartProvider.generateStreamingResponse(messages, options)) {
        if (typeof chunk === 'string') {
          yield chunk
        } else {
          // Final response with metadata
          const finalResponse = chunk as AIResponse
          AIProviderFactory.updateMetrics(smartInstanceId, finalResponse, false)
          
          return {
            ...finalResponse,
            modelAnalysis: {
              queryComplexity: analysis.complexity,
              recommendedModel,
              confidence: analysis.confidence,
              reasoning: analysis.reasoning,
              modelUsed: recommendedModel
            }
          } as AIResponse & { modelAnalysis?: { queryComplexity: string; recommendedModel: string; confidence: number; reasoning: string[]; modelUsed: string } }
        }
      }
    } catch (error) {
      console.warn(`Smart streaming model ${recommendedModel} failed, falling back to default`)
      // Fallback to default provider
      const provider = this.getProvider()
      if (provider.generateStreamingResponse) {
        return yield* provider.generateStreamingResponse(messages, options)
      }
      throw error
    }
    
    // This should never be reached, but TypeScript requires it
    throw new Error('Unexpected end of streaming response')
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
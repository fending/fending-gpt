import { AIProvider, ProviderType, ProviderConfig, ProviderMetrics } from './types'
import { ClaudeProvider, ClaudeModel } from './providers/claude'

export class AIProviderFactory {
  private static instances = new Map<string, AIProvider>()
  private static metrics = new Map<string, ProviderMetrics>()

  static create(
    type: ProviderType, 
    config?: ProviderConfig,
    instanceId?: string,
    modelType?: ClaudeModel
  ): AIProvider {
    const key = instanceId || `${type}-${modelType || 'default'}`
    
    // Return existing instance if available
    if (this.instances.has(key)) {
      return this.instances.get(key)!
    }

    let provider: AIProvider

    switch (type) {
      case 'claude':
        provider = new ClaudeProvider(modelType || 'sonnet', config?.apiKey)
        break
      
      case 'openai':
        // TODO: Implement OpenAI provider
        throw new Error('OpenAI provider not yet implemented')
      
      case 'local':
        // TODO: Implement local provider
        throw new Error('Local provider not yet implemented')
      
      default:
        throw new Error(`Unknown provider type: ${type}`)
    }

    // Validate configuration
    if (!provider.validateConfig()) {
      throw new Error(`Invalid configuration for provider: ${type}`)
    }

    // Store instance for reuse
    this.instances.set(key, provider)
    
    // Initialize metrics
    this.metrics.set(key, {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      averageResponseTime: 0,
      averageConfidence: 0,
      errorRate: 0,
      lastUsed: new Date(),
    })

    return provider
  }

  static getProvider(instanceId: string = 'claude-default'): AIProvider | null {
    return this.instances.get(instanceId) || null
  }

  static async getHealthyProvider(
    preferredType: ProviderType = 'claude',
    fallbackTypes: ProviderType[] = []
  ): Promise<AIProvider> {
    // Try preferred provider first
    try {
      const provider = this.create(preferredType)
      if (await provider.isHealthy()) {
        return provider
      }
    } catch (error) {
      console.warn(`Preferred provider ${preferredType} failed:`, error)
    }

    // Try fallback providers
    for (const fallbackType of fallbackTypes) {
      try {
        const provider = this.create(fallbackType)
        if (await provider.isHealthy()) {
          console.info(`Using fallback provider: ${fallbackType}`)
          return provider
        }
      } catch (error) {
        console.warn(`Fallback provider ${fallbackType} failed:`, error)
      }
    }

    throw new Error('No healthy AI providers available')
  }

  static getAllProviders(): { [key: string]: AIProvider } {
    return Object.fromEntries(this.instances)
  }

  static getMetrics(instanceId?: string) {
    if (instanceId) {
      return this.metrics.get(instanceId)
    }
    return Object.fromEntries(this.metrics)
  }

  static updateMetrics(
    instanceId: string,
    response: { tokensUsed: number; costUsd: number; confidenceScore?: number; responseTimeMs: number },
    error?: boolean
  ) {
    const current = this.metrics.get(instanceId)
    if (!current) return

    const updated = {
      ...current,
      totalRequests: current.totalRequests + 1,
      totalTokens: current.totalTokens + response.tokensUsed,
      totalCost: current.totalCost + response.costUsd,
      lastUsed: new Date(),
    }

    if (error) {
      updated.errorRate = (current.errorRate * current.totalRequests + 1) / updated.totalRequests
    } else {
      updated.errorRate = (current.errorRate * current.totalRequests) / updated.totalRequests
    }

    // Update averages
    updated.averageResponseTime = (
      current.averageResponseTime * (current.totalRequests - 1) + response.responseTimeMs
    ) / updated.totalRequests

    if (response.confidenceScore !== undefined) {
      updated.averageConfidence = (
        current.averageConfidence * (current.totalRequests - 1) + response.confidenceScore
      ) / updated.totalRequests
    }

    this.metrics.set(instanceId, updated)
  }

  static reset() {
    this.instances.clear()
    this.metrics.clear()
  }

  // Utility method to compare providers
  static async compareProviders(
    providers: ProviderType[],
    testMessage: string = "Hello, how are you?"
  ) {
    const results = []

    for (const providerType of providers) {
      try {
        const provider = this.create(providerType)
        
        const response = await provider.generateResponse([
          { role: 'user', content: testMessage }
        ])
        
        results.push({
          provider: providerType,
          success: true,
          responseTime: response.responseTimeMs,
          tokensUsed: response.tokensUsed,
          cost: response.costUsd,
          confidence: response.confidenceScore || 0,
        })
      } catch (error) {
        results.push({
          provider: providerType,
          success: false,
          error: (error as Error).message,
        })
      }
    }

    return results
  }
}
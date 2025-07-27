import { ClaudeModel } from './providers/claude'

export interface QueryAnalysis {
  complexity: 'simple' | 'complex'
  recommendedModel: ClaudeModel
  confidence: number
  reasoning: string[]
}

/**
 * Analyzes a user query to determine complexity and recommend appropriate model
 */
export function analyzeQueryComplexity(message: string): QueryAnalysis {
  const reasoning: string[] = []
  let complexityScore = 0
  const normalizedMessage = message.toLowerCase().trim()
  
  // Length-based analysis
  if (message.length > 150) {
    complexityScore += 2
    reasoning.push('Long query suggests detailed response needed')
  } else if (message.length < 30) {
    complexityScore -= 1
    reasoning.push('Short query likely needs simple response')
  }
  
  // Complex question indicators
  const complexIndicators = [
    'explain', 'analyze', 'compare', 'contrast', 'strategy', 'approach',
    'experience with', 'tell me about', 'what do you think', 'how would',
    'what would you', 'walk me through', 'describe', 'elaborate',
    'discuss', 'thoughts on', 'opinion', 'perspective', 'assessment',
    'evaluation', 'recommendation', 'advice', 'guidance', 'insight'
  ]
  
  const complexMatches = complexIndicators.filter(indicator => 
    normalizedMessage.includes(indicator)
  )
  
  if (complexMatches.length > 0) {
    complexityScore += complexMatches.length * 2
    reasoning.push(`Complex question words: ${complexMatches.join(', ')}`)
  }
  
  // Simple question indicators  
  const simpleIndicators = [
    'when', 'where', 'who', 'what', 'which', 'how long', 'how many',
    'yes or no', 'true or false', 'list', 'name'
  ]
  
  const simpleMatches = simpleIndicators.filter(indicator =>
    normalizedMessage.includes(indicator)
  )
  
  if (simpleMatches.length > 0 && complexMatches.length === 0) {
    complexityScore -= 2
    reasoning.push(`Simple question words: ${simpleMatches.join(', ')}`)
  }
  
  // Multi-part questions (suggest complexity)
  const questionMarks = (message.match(/\?/g) || []).length
  if (questionMarks > 1) {
    complexityScore += 1
    reasoning.push('Multiple questions in one message')
  }
  
  // Technical depth indicators
  const technicalTerms = [
    'architecture', 'implementation', 'framework', 'methodology',
    'best practices', 'integration', 'scalability', 'performance',
    'security', 'compliance', 'governance', 'transformation',
    'migration', 'optimization', 'automation', 'artificial intelligence',
    'machine learning', 'cloud', 'infrastructure', 'cybersecurity'
  ]
  
  const techMatches = technicalTerms.filter(term =>
    normalizedMessage.includes(term)
  )
  
  if (techMatches.length > 0) {
    complexityScore += Math.min(techMatches.length, 3)
    reasoning.push(`Technical terms suggest detailed response: ${techMatches.slice(0, 3).join(', ')}`)
  }
  
  // Contextual complexity indicators
  if (normalizedMessage.includes('brian has') || normalizedMessage.includes('brian worked') ||
      normalizedMessage.includes('brian led') || normalizedMessage.includes('brian managed')) {
    complexityScore += 1
    reasoning.push('Asking about specific experience details')
  }
  
  // Industry/role specific questions
  const roleTerms = [
    'cio', 'chief information officer', 'executive', 'leadership',
    'board', 'strategic', 'enterprise', 'fortune 500', 'consulting',
    'entrepreneur', 'startup'
  ]
  
  const roleMatches = roleTerms.filter(term =>
    normalizedMessage.includes(term)
  )
  
  if (roleMatches.length > 0) {
    complexityScore += 1
    reasoning.push(`Role-specific question: ${roleMatches.join(', ')}`)
  }
  
  // Determine final complexity
  const isComplex = complexityScore > 1
  const confidence = Math.min(0.9, Math.max(0.6, Math.abs(complexityScore) / 5))
  
  // Add default reasoning if none found
  if (reasoning.length === 0) {
    reasoning.push('Default classification based on message characteristics')
  }
  
  return {
    complexity: isComplex ? 'complex' : 'simple',
    recommendedModel: isComplex ? 'sonnet' : 'haiku',
    confidence,
    reasoning
  }
}

/**
 * Quick model recommendation without detailed analysis
 */
export function getRecommendedModel(message: string): ClaudeModel {
  return analyzeQueryComplexity(message).recommendedModel
}
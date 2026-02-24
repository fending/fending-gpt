import { describe, it, expect } from 'vitest'
import { analyzeQueryComplexity, getRecommendedModel } from './query-analyzer'

describe('analyzeQueryComplexity', () => {
  it('classifies short simple questions as simple/haiku', () => {
    const result = analyzeQueryComplexity('Where did Brian go to school?')
    expect(result.complexity).toBe('simple')
    expect(result.recommendedModel).toBe('haiku')
  })

  it('classifies long detailed questions as complex/sonnet', () => {
    const result = analyzeQueryComplexity(
      'Can you explain Brian\'s approach to enterprise architecture and how he has implemented digital transformation strategies across Fortune 500 companies? I\'d like to understand his methodology.'
    )
    expect(result.complexity).toBe('complex')
    expect(result.recommendedModel).toBe('sonnet')
  })

  it('detects complex indicator words', () => {
    const result = analyzeQueryComplexity('Analyze Brian\'s experience with cloud migration')
    expect(result.complexity).toBe('complex')
    expect(result.reasoning.some(r => r.includes('Complex question words'))).toBe(true)
  })

  it('detects simple indicator words without complex ones', () => {
    const result = analyzeQueryComplexity('When did Brian start working?')
    expect(result.complexity).toBe('simple')
    expect(result.reasoning.some(r => r.includes('Simple question words'))).toBe(true)
  })

  it('does not apply simple indicator reduction when complex indicators present', () => {
    const result = analyzeQueryComplexity('When did Brian explain his strategy?')
    // 'when' is simple but 'explain' and 'strategy' are complex
    expect(result.complexity).toBe('complex')
  })

  it('detects multiple questions as more complex', () => {
    const result = analyzeQueryComplexity('What skills does Brian have? What projects has he led?')
    expect(result.reasoning.some(r => r.includes('Multiple questions'))).toBe(true)
  })

  it('detects technical terms', () => {
    const result = analyzeQueryComplexity('Tell me about cybersecurity and compliance')
    expect(result.reasoning.some(r => r.includes('Technical terms'))).toBe(true)
  })

  it('detects role-specific questions', () => {
    const result = analyzeQueryComplexity('What was Brian\'s experience as a CIO?')
    expect(result.reasoning.some(r => r.includes('Role-specific'))).toBe(true)
  })

  it('caps confidence between 0.6 and 0.9', () => {
    const simple = analyzeQueryComplexity('Hi')
    const complex = analyzeQueryComplexity(
      'Explain and analyze Brian\'s approach to governance, compliance, cybersecurity, and cloud infrastructure strategy in the context of enterprise digital transformation leadership at Fortune 500 companies'
    )
    expect(simple.confidence).toBeGreaterThanOrEqual(0.6)
    expect(simple.confidence).toBeLessThanOrEqual(0.9)
    expect(complex.confidence).toBeGreaterThanOrEqual(0.6)
    expect(complex.confidence).toBeLessThanOrEqual(0.9)
  })

  it('provides default reasoning when no indicators match', () => {
    const result = analyzeQueryComplexity('hello')
    expect(result.reasoning.length).toBeGreaterThan(0)
  })
})

describe('getRecommendedModel', () => {
  it('returns haiku for simple queries', () => {
    expect(getRecommendedModel('Who is Brian?')).toBe('haiku')
  })

  it('returns sonnet for complex queries', () => {
    expect(getRecommendedModel('Explain Brian\'s approach to enterprise architecture and digital transformation')).toBe('sonnet')
  })
})

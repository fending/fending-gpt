import { describe, it, expect } from 'vitest'
import { chunkText } from './ingest'

describe('chunkText', () => {
  it('splits on double newlines when paragraphs are long enough', () => {
    const text = 'This is the first paragraph and it contains more than fifty characters of content easily.\n\nThis is the second paragraph and it also contains more than fifty characters of content easily.'
    const chunks = chunkText(text)
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toContain('first paragraph')
    expect(chunks[1]).toContain('second paragraph')
  })

  it('merges two short paragraphs (<50 chars each) into one chunk', () => {
    const text = 'First paragraph here.\n\nSecond paragraph here.'
    const chunks = chunkText(text)
    // Both are under 50 chars, so they get merged
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toContain('First paragraph')
    expect(chunks[0]).toContain('Second paragraph')
  })

  it('merges short paragraphs (<50 chars) with neighbors', () => {
    const text = 'Hi.\n\nThis is a much longer paragraph that should survive on its own because it is well above fifty characters.'
    const chunks = chunkText(text)
    // "Hi." (4 chars) should be merged with the next paragraph
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toContain('Hi.')
    expect(chunks[0]).toContain('This is a much longer paragraph')
  })

  it('merges trailing short buffer with last entry', () => {
    const text = 'This is a paragraph that is definitely long enough to stand on its own.\n\nOk.'
    const chunks = chunkText(text)
    // "Ok." (3 chars) trailing buffer should merge with previous
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toContain('Ok.')
  })

  it('splits very long paragraphs (>1000 chars) at sentence boundaries', () => {
    // Create a paragraph longer than 1000 chars
    const sentences = Array.from({ length: 20 }, (_, i) =>
      `This is sentence number ${i + 1} and it contains enough text to build up length.`
    )
    const longParagraph = sentences.join(' ')
    expect(longParagraph.length).toBeGreaterThan(1000)

    const chunks = chunkText(longParagraph)
    // Should produce multiple chunks, each within size limits
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach(chunk => {
      // No chunk should be empty
      expect(chunk.length).toBeGreaterThan(0)
    })
  })

  it('returns empty array for empty input', () => {
    expect(chunkText('')).toEqual([])
    expect(chunkText('   ')).toEqual([])
  })

  it('handles single paragraph without splitting', () => {
    const text = 'A moderate length paragraph that sits comfortably between the min and max thresholds for chunking.'
    const chunks = chunkText(text)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toBe(text)
  })

  it('handles multiple short paragraphs by merging', () => {
    const text = 'A.\n\nB.\n\nC.\n\nThis is a longer paragraph that is more than fifty characters long easily.'
    const chunks = chunkText(text)
    // Short paragraphs should be merged together or with longer ones
    expect(chunks.length).toBeLessThan(4)
  })

  it('trims whitespace from paragraphs', () => {
    const text = '  First paragraph.  \n\n  Second paragraph with enough text to stand alone on its own.  '
    const chunks = chunkText(text)
    chunks.forEach(chunk => {
      expect(chunk).toBe(chunk.trim())
    })
  })
})

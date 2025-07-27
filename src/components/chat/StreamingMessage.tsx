'use client'

import { useState, useEffect, useRef } from 'react'
import { User, Bot } from 'lucide-react'

interface StreamingMessageProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  onStreamComplete?: () => void
}

export default function StreamingMessage({ 
  role, 
  content, 
  isStreaming = false,
  onStreamComplete 
}: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showCursor, setShowCursor] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const cursorIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isStreaming && role === 'assistant') {
      // Start cursor blinking
      setShowCursor(true)
      cursorIntervalRef.current = setInterval(() => {
        setShowCursor(prev => !prev)
      }, 500)

      // Smart typing with word boundary awareness
      if (currentIndex < content.length) {
        intervalRef.current = setTimeout(() => {
          const nextChunk = getNextChunk(content, currentIndex)
          setDisplayedContent(content.slice(0, currentIndex + nextChunk.length))
          setCurrentIndex(prev => prev + nextChunk.length)
        }, getTypingDelay(content, currentIndex))
      } else {
        // Finished typing
        setShowCursor(false)
        if (cursorIntervalRef.current) {
          clearInterval(cursorIntervalRef.current)
          cursorIntervalRef.current = null
        }
        onStreamComplete?.()
      }
    } else {
      // Not streaming, show full content immediately
      setDisplayedContent(content)
      setShowCursor(false)
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
        intervalRef.current = null
      }
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current)
        cursorIntervalRef.current = null
      }
    }
  }, [content, currentIndex, isStreaming, role, onStreamComplete])

  // Reset when starting a new streaming message (but not on content updates during streaming)
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(content)
      setCurrentIndex(content.length)
      setShowCursor(false)
    } else if (currentIndex === 0 && content.length > 0) {
      // Only reset at the start of a new streaming message
      setDisplayedContent('')
      setCurrentIndex(0)
      setShowCursor(true)
    }
  }, [content, isStreaming, currentIndex])

  // Helper function to get next chunk of text (word-aware)
  const getNextChunk = (text: string, startIndex: number): string => {
    if (startIndex >= text.length) return ''
    
    const remainingText = text.slice(startIndex)
    
    // If we're at a space or punctuation, show the next word
    const wordMatch = remainingText.match(/^(\s*\S+)/)
    if (wordMatch && wordMatch[1].length <= 15) { // Don't chunk very long words
      return wordMatch[1]
    }
    
    // For very long words or other cases, fall back to character-by-character
    return remainingText[0]
  }

  // Helper function to calculate typing delay based on context
  const getTypingDelay = (text: string, currentIndex: number): number => {
    if (currentIndex >= text.length) return 0
    
    const currentChar = text[currentIndex]
    
    // Longer pauses after sentences and line breaks
    if (currentChar === '.' || currentChar === '!' || currentChar === '?') {
      return 200
    }
    
    // Medium pause after commas and colons
    if (currentChar === ',' || currentChar === ':' || currentChar === ';') {
      return 100
    }
    
    // Shorter pause after spaces (word boundaries)
    if (currentChar === ' ') {
      return 50
    }
    
    // Line breaks get longer pauses
    if (currentChar === '\n') {
      return 300
    }
    
    // Default typing speed for characters
    return 20
  }

  const isAssistant = role === 'assistant'

  return (
    <div className={`flex gap-3 p-4 ${isAssistant ? 'bg-gray-50' : 'bg-white'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isAssistant 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-700 text-white'
      }`}>
        {isAssistant ? <Bot size={16} /> : <User size={16} />}
      </div>
      
      <div className="flex-1">
        <div className="font-medium text-sm mb-1">
          {isAssistant ? 'Assistant' : 'You'}
        </div>
        <div className="text-gray-900 whitespace-pre-wrap">
          {displayedContent}
          {isStreaming && showCursor && (
            <span className="inline-block w-2 h-5 bg-blue-500 ml-1 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  )
}
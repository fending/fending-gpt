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

      // Type out the content
      if (currentIndex < content.length) {
        intervalRef.current = setTimeout(() => {
          setDisplayedContent(content.slice(0, currentIndex + 1))
          setCurrentIndex(prev => prev + 1)
        }, 15 + Math.random() * 20) // Faster typing - doubled the speed
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

  // Reset when content changes (new message)
  useEffect(() => {
    setDisplayedContent('')
    setCurrentIndex(0)
    setShowCursor(false)
  }, [content])

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
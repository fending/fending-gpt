'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import TextareaAutosize from 'react-textarea-autosize'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  initialValue?: string
  focusAfterSend?: boolean
}

export default function ChatInput({ onSendMessage, disabled, initialValue, focusAfterSend }: ChatInputProps) {
  const [message, setMessage] = useState(initialValue || '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Update message when initialValue changes (for abort repopulation)
  useEffect(() => {
    if (initialValue) {
      setMessage(initialValue)
    }
  }, [initialValue])

  // Focus after send when enabled and not disabled
  useEffect(() => {
    if (focusAfterSend && !disabled) {
      textareaRef.current?.focus()
    }
  }, [focusAfterSend, disabled])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t bg-white">
      <div className="flex-1 relative">
        <TextareaAutosize
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Press Enter to send)"
          disabled={disabled}
          minRows={1}
          maxRows={5}
          className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
        />
      </div>
      <Button
        type="submit"
        disabled={!message.trim() || disabled}
        size="icon"
        className="self-end"
      >
        <Send size={16} />
      </Button>
    </form>
  )
}
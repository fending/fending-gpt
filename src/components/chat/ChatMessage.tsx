'use client'

import { Message } from '@/types'
import { format } from 'date-fns'
import { User, Bot } from 'lucide-react'

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 p-4 ${isUser ? 'bg-blue-50' : 'bg-gray-50'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'
      }`}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {isUser ? 'You' : 'Assistant'}
          </span>
          <span className="text-xs text-gray-500">
            {format(new Date(message.created_at), 'h:mm a')}
          </span>
        </div>
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    </div>
  )
}
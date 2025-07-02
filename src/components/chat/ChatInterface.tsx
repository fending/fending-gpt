'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Message, Conversation } from '@/types'
import { createClient } from '@/lib/supabase/client'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import { Loader2 } from 'lucide-react'

interface ChatInterfaceProps {
  conversationId?: string
  onConversationCreated?: (conversation: Conversation) => void
  onConversationUpdated?: () => void
}

export default function ChatInterface({
  conversationId,
  onConversationCreated,
  onConversationUpdated,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }, [conversationId, supabase])

  useEffect(() => {
    if (conversationId) {
      fetchMessages()
    } else {
      setMessages([])
    }
  }, [conversationId, fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (content: string) => {
    setSendingMessage(true)
    
    try {
      let currentConversationId = conversationId

      // Create new conversation if one doesn't exist
      if (!currentConversationId) {
        const { data: conversationData, error: conversationError } = await supabase
          .from('conversations')
          .insert({
            title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          })
          .select()
          .single()

        if (conversationError) throw conversationError
        currentConversationId = conversationData.id
        onConversationCreated?.(conversationData)
      }

      // Add user message
      const { data: userMessage, error: userMessageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversationId,
          role: 'user',
          content,
        })
        .select()
        .single()

      if (userMessageError) throw userMessageError
      setMessages(prev => [...prev, userMessage])

      // Send to Claude API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          conversationId: currentConversationId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response from Claude')
      }

      const data = await response.json()
      
      // Add assistant message
      const { data: assistantMessage, error: assistantMessageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversationId,
          role: 'assistant',
          content: data.response,
          tokens_used: data.tokensUsed,
        })
        .select()
        .single()

      if (assistantMessageError) throw assistantMessageError
      setMessages(prev => [...prev, assistantMessage])

      // Update conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentConversationId)

      onConversationUpdated?.()

    } catch (error) {
      console.error('Error sending message:', error)
      // Show error message to user - you can implement toast here
      alert('Failed to send message. Please try again.')
    } finally {
      setSendingMessage(false)
    }
  }

  if (!conversationId && messages.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to AI Chat Assistant
            </h2>
            <p className="text-gray-600 mb-4">
              Start a conversation by typing a message below
            </p>
          </div>
        </div>
        <ChatInput onSendMessage={sendMessage} disabled={sendingMessage} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : (
          <div className="space-y-0">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {sendingMessage && (
              <div className="flex gap-3 p-4 bg-gray-50">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-500 text-white flex items-center justify-center">
                  <Loader2 className="animate-spin" size={16} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm mb-1">Assistant</div>
                  <div className="text-gray-500">Thinking...</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <ChatInput onSendMessage={sendMessage} disabled={sendingMessage} />
    </div>
  )
}
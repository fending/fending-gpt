'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import ChatLoader from './ChatLoader'
import { Loader2 } from 'lucide-react'

interface SessionMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  tokens_used: number | null
  cost_usd: number | null
  confidence_score: number | null
  response_time_ms: number | null
}

interface SessionChatInterfaceProps {
  sessionToken: string
}

export default function SessionChatInterface({ sessionToken }: SessionChatInterfaceProps) {
  const [messages, setMessages] = useState<SessionMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [currentAbortController, setCurrentAbortController] = useState<AbortController | null>(null)
  const [lastMessage, setLastMessage] = useState('')
  const [sessionInfo, setSessionInfo] = useState<{
    sessionId: string
    status: string
    expiresAt: string
  } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = useCallback(async () => {
    if (!sessionToken) return

    setLoading(true)
    try {
      // Get session info
      const sessionResponse = await fetch(`/api/session/start?token=${sessionToken}`)
      if (!sessionResponse.ok) {
        throw new Error('Session not found or expired')
      }
      const sessionData = await sessionResponse.json()
      setSessionInfo(sessionData)

      // Get messages for this session
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionData.sessionId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
      // Handle session expiry or error
      alert('Session expired or invalid. Please start a new session.')
      window.location.href = '/'
    } finally {
      setLoading(false)
    }
  }, [sessionToken, supabase])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (content: string) => {
    setSendingMessage(true)
    setLastMessage(content)
    
    // Create abort controller for this request
    const abortController = new AbortController()
    setCurrentAbortController(abortController)
    
    try {
      // Send to session-based chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          sessionToken,
        }),
        signal: abortController.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      await response.json()
      
      // Refresh messages to get the latest
      await fetchMessages()
      
      // Clear the input after successful response
      setLastMessage('')

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, don't show error
        return
      }
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSendingMessage(false)
      setCurrentAbortController(null)
    }
  }

  const handleAbortMessage = () => {
    if (currentAbortController) {
      currentAbortController.abort()
      setCurrentAbortController(null)
      setSendingMessage(false)
    }
  }

  const handleAbortComplete = () => {
    // Message will be repopulated via initialValue prop
    // Clear the lastMessage after a brief delay so user can edit
    setTimeout(() => {
      setLastMessage('')
    }, 100)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome! I&apos;m Brian&apos;s AI Assistant
            </h2>
            <p className="text-gray-600 mb-4">
              I can help answer questions about Brian&apos;s background, experience, skills, and projects. 
              What would you like to know?
            </p>
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
              <p><strong>Try asking about:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Technical skills and experience</li>
                <li>Recent projects and achievements</li>
                <li>Leadership and team experience</li>
                <li>Career goals and interests</li>
              </ul>
            </div>
          </div>
        </div>
        {sendingMessage && (
          <ChatLoader 
            onAbort={handleAbortMessage}
            onAbortComplete={handleAbortComplete}
            originalMessage={lastMessage}
          />
        )}
        <ChatInput 
          onSendMessage={sendMessage} 
          disabled={sendingMessage}
          initialValue={lastMessage}
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Session Info */}
      {sessionInfo && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-blue-800">
              Chat Session Active
            </span>
            <span className="text-blue-600">
              Expires: {new Date(sessionInfo.expiresAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-0">
          {messages.map((message) => (
            <ChatMessage 
              key={message.id} 
              message={{
                id: message.id,
                conversation_id: sessionInfo?.sessionId || '',
                role: message.role,
                content: message.content,
                tokens_used: message.tokens_used,
                created_at: message.created_at,
              }} 
            />
          ))}
          {sendingMessage && (
            <ChatLoader 
              onAbort={handleAbortMessage}
              onAbortComplete={handleAbortComplete}
              originalMessage={lastMessage}
            />
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <ChatInput 
        onSendMessage={sendMessage} 
        disabled={sendingMessage}
        initialValue={lastMessage}
      />
    </div>
  )
}
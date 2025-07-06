'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import ChatLoader from './ChatLoader'
import StreamingMessage from './StreamingMessage'
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
  const [abortMessage, setAbortMessage] = useState('')
  const [streamingMessage, setStreamingMessage] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState(false)
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

      if (error) {
        console.error('❌ Database error fetching messages:', error)
        throw error
      }
      
      console.log(`🔍 Database query returned ${data?.length || 0} messages for session ${sessionData.sessionId}`)
      
      // Always use database messages as the source of truth, only preserving temp messages that aren't persisted yet
      setMessages(prev => {
        const dbMessages = data || []
        const tempMessages = prev.filter(msg => msg.id.startsWith('temp-'))
        
        console.log(`📥 Fetched ${dbMessages.length} messages from DB, ${tempMessages.length} temp messages`)
        
        // If there are temp messages, check if they've been persisted to DB
        if (tempMessages.length > 0) {
          const pendingTempMessages = tempMessages.filter(tempMsg => {
            // Keep temp message only if there's no DB message with same content AND role from recent time
            const isAlreadyPersisted = dbMessages.some(dbMsg => 
              dbMsg.content.trim() === tempMsg.content.trim() && 
              dbMsg.role === tempMsg.role &&
              Math.abs(new Date(dbMsg.created_at).getTime() - new Date(tempMsg.created_at).getTime()) < 10000 // Within 10 seconds
            )
            return !isAlreadyPersisted
          })
          
          // Combine persisted messages with any pending temp messages
          const allMessages = [...dbMessages, ...pendingTempMessages]
          const sortedMessages = allMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          
          console.log(`💬 Final: ${dbMessages.length} DB + ${pendingTempMessages.length} pending = ${sortedMessages.length} total`)
          return sortedMessages
        }
        
        console.log(`💬 Using DB messages only: ${dbMessages.length}`)
        return dbMessages
      })
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
  }, [messages, streamingMessage])

  const sendMessage = async (content: string) => {
    setSendingMessage(true)
    setLastMessage('') // Clear immediately for UX
    setAbortMessage(content) // Store for abort functionality
    setStreamingMessage('')
    setIsStreaming(true)
    
    // Add user message to conversation immediately
    const userMessage: SessionMessage = {
      id: `temp-${Date.now()}`, // Temporary ID
      role: 'user',
      content: content,
      created_at: new Date().toISOString(),
      tokens_used: null,
      cost_usd: null,
      confidence_score: null,
      response_time_ms: null
    }
    setMessages(prev => [...prev, userMessage])
    
    // Create abort controller for this request
    const abortController = new AbortController()
    setCurrentAbortController(abortController)
    
    try {
      // Send to streaming chat API
      const response = await fetch('/api/chat/stream', {
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

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      console.log('📡 Starting to read stream...')
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log('📡 Stream reading complete')
            break
          }
          
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.chunk) {
                  console.log('📝 Received chunk:', data.chunk.length, 'chars')
                  setStreamingMessage(prev => prev + data.chunk)
                } else if (data.done) {
                  // Stream complete
                  console.log('✅ Streaming API succeeded')
                  setIsStreaming(false)
                  setStreamingMessage('')
                  // Add a small delay to ensure database write is complete before fetching
                  setTimeout(async () => {
                    await fetchMessages()
                  }, 500)
                  // Clear the input after successful streaming response
                  setLastMessage('')
                  setAbortMessage('')
                } else if (data.error) {
                  throw new Error(data.error)
                }
              } catch (parseError) {
                console.warn('⚠️ Failed to parse stream data:', line, parseError)
              }
            }
          }
        }
      } else {
        console.error('❌ No response body reader available')
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, don't show error
        return
      }
      
      console.error('Streaming API failed:', error)
      console.log('🔄 Falling back to non-streaming API...')
      setIsStreaming(false)
      setStreamingMessage('')
      
      // Fallback to non-streaming API
      try {
        const fallbackResponse = await fetch('/api/chat', {
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

        if (!fallbackResponse.ok) {
          const errorData = await fallbackResponse.json()
          throw new Error(errorData.error || 'Failed to send message')
        }

        await fallbackResponse.json()
        console.log('✅ Fallback API succeeded')
        
        // Add a small delay to ensure database write is complete before fetching
        setTimeout(async () => {
          await fetchMessages()
        }, 500)
        
        // Clear the input after successful fallback response
        setLastMessage('')
        setAbortMessage('')
        
      } catch (fallbackError) {
        console.error('❌ Fallback API also failed:', fallbackError)
        alert('Failed to send message. Please try again.')
      }
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
      setIsStreaming(false)
      setStreamingMessage('')
    }
  }

  const handleAbortComplete = () => {
    // Restore the aborted message to input so user can edit
    setLastMessage(abortMessage)
    // Clear abort message
    setAbortMessage('')
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
        {sendingMessage && !isStreaming && !streamingMessage && (
          <ChatLoader 
            onAbort={handleAbortMessage}
            onAbortComplete={handleAbortComplete}
            originalMessage={abortMessage}
          />
        )}
        {(isStreaming || streamingMessage) && (
          <StreamingMessage 
            role="assistant"
            content={streamingMessage}
            isStreaming={isStreaming}
            onStreamComplete={() => setIsStreaming(false)}
          />
        )}
        <ChatInput 
          onSendMessage={sendMessage} 
          disabled={sendingMessage}
          initialValue={sendingMessage ? lastMessage : ''}
          focusAfterSend={!sendingMessage}
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
          {sendingMessage && !isStreaming && !streamingMessage && (
            <ChatLoader 
              onAbort={handleAbortMessage}
              onAbortComplete={handleAbortComplete}
              originalMessage={lastMessage}
            />
          )}
          {(isStreaming || streamingMessage) && (
            <StreamingMessage 
              role="assistant"
              content={streamingMessage}
              isStreaming={isStreaming}
              onStreamComplete={() => setIsStreaming(false)}
            />
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <ChatInput 
        onSendMessage={sendMessage} 
        disabled={sendingMessage}
        initialValue={lastMessage}
        focusAfterSend={!sendingMessage}
      />
    </div>
  )
}
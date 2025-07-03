'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SessionChatInterface from '@/components/chat/SessionChatInterface'

function ChatPageContent() {
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const initializeSession = async () => {
      // Check for token in URL (from email link)
      const urlToken = searchParams.get('token')
      
      if (urlToken) {
        // Token from email link - verify and activate session
        try {
          const response = await fetch(`/api/session/start?token=${urlToken}`)
          const data = await response.json()
          
          if (data.error) {
            alert('Invalid or expired session link. Please request a new one.')
            router.push('/')
            return
          }
          
          // Store token and use it
          localStorage.setItem('sessionToken', urlToken)
          setSessionToken(urlToken)
          setIsAdmin(data.isAdmin || false)
          setLoading(false)
          
          // Clean URL
          window.history.replaceState({}, '', '/chat')
          return
        } catch (error) {
          console.error('Error verifying token:', error)
          alert('Error accessing session. Please try again.')
          router.push('/')
          return
        }
      }

      // Check for existing token in localStorage
      const storedToken = localStorage.getItem('sessionToken')
      if (!storedToken) {
        // No session token, redirect to home to start new session
        router.push('/')
        return
      }

      // Verify stored session is still valid
      try {
        const response = await fetch(`/api/session/start?token=${storedToken}`)
        const data = await response.json()
        
        if (data.error) {
          // Session invalid, clear token and redirect
          localStorage.removeItem('sessionToken')
          router.push('/')
          return
        }
        
        setSessionToken(storedToken)
        setIsAdmin(data.isAdmin || false)
      } catch {
        // Error checking session, redirect to home
        localStorage.removeItem('sessionToken')
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    initializeSession()
  }, [router, searchParams])

  if (loading || !sessionToken) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loading ? 'Verifying session...' : 'Loading chat...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Simple header for session-based chat */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-900">
            Brian&apos;s AI Assistant
          </h1>
          <div className="flex items-center space-x-3">
            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className="text-sm text-white bg-blue-800 hover:bg-blue-900 px-3 py-1 rounded"
              >
                Admin
              </button>
            )}
            <button
              onClick={async () => {
                try {
                  // Call session end API to trigger queue updates
                  await fetch('/api/session/end', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${sessionToken}`
                    }
                  })
                } catch (error) {
                  console.error('Error ending session:', error)
                } finally {
                  // Always clean up and redirect
                  localStorage.removeItem('sessionToken')
                  router.push('/')
                }
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              End Session (Log Out)
            </button>
          </div>
        </div>
      </div>
      
      <main className="flex-1 max-w-4xl mx-auto w-full overflow-hidden">
        <SessionChatInterface sessionToken={sessionToken} />
      </main>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense 
      fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading chat...</p>
          </div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  )
}
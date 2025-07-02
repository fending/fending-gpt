'use client'

import React, { useState, useEffect } from 'react'
import { Mail, Bot, CheckCircle, Users, Clock } from 'lucide-react'
import { useRecaptcha } from '@/lib/security/useRecaptcha'
import { createClient } from '@/lib/supabase/client'

interface SessionStatus {
  status: 'email_collection' | 'email_sent' | 'active' | 'queued' | 'loading'
  sessionId?: string
  sessionToken?: string
  queuePosition?: number
  estimatedWaitMinutes?: number
  userEmail?: string
}

export default function SessionStart() {
  const [email, setEmail] = useState('')
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({ status: 'email_collection' })
  const { execute: executeRecaptcha, loading: recaptchaLoading } = useRecaptcha()

  // Load reCAPTCHA script (skip in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('DEV: Skipping reCAPTCHA script loading for localhost')
      return
    }

    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`
    script.async = true
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // Handle email submission
  const handleEmailSubmit = async () => {
    if (!email.trim()) return
    
    setSessionStatus({ status: 'loading' })
    
    try {
      // Execute reCAPTCHA
      const recaptchaToken = await executeRecaptcha('session_request')
      if (!recaptchaToken) {
        throw new Error('reCAPTCHA verification failed')
      }

      const response = await fetch('/api/session/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(),
          recaptchaToken 
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request session')
      }

      if (data.status === 'queued') {
        // User is queued - show queue status
        setSessionStatus({
          status: 'queued',
          queuePosition: data.queuePosition,
          estimatedWaitMinutes: data.estimatedWaitMinutes,
          userEmail: email.trim(),
          sessionToken: data.sessionToken
        })
      } else {
        // Show email sent confirmation
        setSessionStatus({ 
          status: 'email_sent', 
          userEmail: email.trim() 
        })
      }

    } catch (error) {
      console.error('Error requesting session:', error)
      setSessionStatus({ status: 'email_collection' })
      alert('Failed to send email. Please try again.')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleEmailSubmit()
    }
  }

  const resetToEmailCollection = () => {
    setSessionStatus({ status: 'email_collection' })
    setEmail('')
  }

  // Show different views based on status
  if (sessionStatus.status === 'email_collection') {
    return <EmailCollectionForm 
      email={email} 
      setEmail={setEmail}
      onSubmit={handleEmailSubmit} 
      onKeyDown={handleKeyDown}
      isSubmitting={recaptchaLoading}
    />
  }

  if (sessionStatus.status === 'email_sent') {
    return <EmailSentConfirmation 
      email={sessionStatus.userEmail!} 
      onBack={resetToEmailCollection} 
    />
  }

  if (sessionStatus.status === 'queued') {
    return <QueueStatus 
      position={sessionStatus.queuePosition!}
      estimatedWait={sessionStatus.estimatedWaitMinutes!}
      userEmail={sessionStatus.userEmail}
      sessionToken={sessionStatus.sessionToken!}
      onBack={resetToEmailCollection}
    />
  }

  if (sessionStatus.status === 'loading') {
    return <LoadingState />
  }

  return null
}

// Email Collection Form Component
function EmailCollectionForm({ 
  email, 
  setEmail, 
  onSubmit, 
  onKeyDown,
  isSubmitting = false
}: { 
  email: string
  setEmail: (email: string) => void
  onSubmit: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  isSubmitting?: boolean
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Meet Brian&apos;s AI Assistant</h2>
          <p className="text-gray-600 mt-2">
            Get instant answers about Brian&apos;s background, experience, and skills. 
            Perfect for recruiters and potential collaborators. 
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="your@email.com"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              We&apos;ll send you a secure link to start the conversation
            </p>
          </div>

          <button
            onClick={onSubmit}
            disabled={!email.trim() || isSubmitting}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
          >
            <Mail className="w-4 h-4" />
            <span>{isSubmitting ? 'Verifying...' : 'Send Chat Link'}</span>
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-400 text-center">
          <p>Direct access to Brian&apos;s professional information</p>
          <p>Secure • No spam • <strong><a href="https://www.brianfending.com/contact">Questions?</a></strong></p>
        </div>
      </div>
    </div>
  )
}

// Email Sent Confirmation Component
function EmailSentConfirmation({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
        <p className="text-gray-600 mb-6">
          We&apos;ve sent a secure link to <strong>{email}</strong> to start your conversation with Brian&apos;s AI assistant.
        </p>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center space-x-2 text-sm text-blue-800">
            <Mail className="w-4 h-4" />
            <span>The link will expire in 1 hour for security</span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Don&apos;t see the email? Check your spam folder or try again with a different email address.
          </p>
          
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-700 text-sm underline"
          >
            Try a different email
          </button>
        </div>
      </div>
    </div>
  )
}

// Real-time Queue Status Component
function QueueStatus({ 
  position: initialPosition, 
  estimatedWait: initialEstimatedWait, 
  userEmail,
  sessionToken,
  onBack 
}: { 
  position: number
  estimatedWait: number
  userEmail?: string
  sessionToken: string
  onBack: () => void
}) {
  const [position, setPosition] = useState(initialPosition)
  const [estimatedWait, setEstimatedWait] = useState(initialEstimatedWait)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to changes in chat_sessions table for this specific session
    const subscription = supabase
      .channel('queue-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_sessions',
          filter: `token=eq.${sessionToken}`
        },
        (payload) => {
          console.log('Queue update received:', payload)
          setLastUpdate(new Date())
          
          if (payload.eventType === 'UPDATE') {
            const session = payload.new as { status: string; queue_position?: number }
            
            // If session becomes active, redirect to chat
            if (session.status === 'active') {
              console.log('Session activated, redirecting to chat...')
              window.location.href = `/chat?token=${sessionToken}`
              return
            }
            
            // Update queue position if still queued
            if (session.status === 'queued' && session.queue_position) {
              const newPosition = session.queue_position
              const newEstimatedWait = newPosition * 15 // 15 minutes per position
              setPosition(newPosition)
              setEstimatedWait(newEstimatedWait)
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    // Also listen for general queue changes to recalculate positions
    const queueSubscription = supabase
      .channel('general-queue-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_sessions',
          filter: 'status=in.(active,queued,expired)'
        },
        () => {
          // Recalculate queue position when any session changes
          recalculateQueuePosition()
        }
      )
      .subscribe()

    const recalculateQueuePosition = async () => {
      try {
        // Get current session to check status
        const { data: currentSession } = await supabase
          .from('chat_sessions')
          .select('status, queue_position')
          .eq('token', sessionToken)
          .single()

        if (currentSession?.status === 'active') {
          window.location.href = `/chat?token=${sessionToken}`
          return
        }

        if (currentSession?.status === 'queued') {
          // Count sessions ahead in queue
          const { count: sessionsAhead } = await supabase
            .from('chat_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'queued')
            .lt('queue_position', currentSession.queue_position)

          const newPosition = (sessionsAhead || 0) + 1
          const newEstimatedWait = newPosition * 15

          if (newPosition !== position) {
            setPosition(newPosition)
            setEstimatedWait(newEstimatedWait)
            setLastUpdate(new Date())
          }
        }
      } catch (error) {
        console.error('Error recalculating queue position:', error)
      }
    }

    // Initial position recalculation
    recalculateQueuePosition()

    return () => {
      subscription.unsubscribe()
      queueSubscription.unsubscribe()
    }
  }, [sessionToken, position])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-yellow-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re in the queue</h2>
        <p className="text-gray-600 mb-2">
          Thanks for your patience! We limit concurrent conversations to ensure quality responses.
        </p>
        {userEmail && (
          <p className="text-sm text-blue-600 mb-6">
            Email: {userEmail}
          </p>
        )}

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Position in queue:</span>
            <span className="font-bold text-blue-600 text-lg">#{position}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-gray-600">Estimated wait:</span>
            <span className="font-medium text-gray-900">{estimatedWait} minutes</span>
          </div>
        </div>

        {/* Real-time status indicator */}
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 mb-4">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{isConnected ? 'Live updates' : 'Reconnecting...'}</span>
          {isConnected && (
            <span className="text-gray-400">
              • Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 mb-4">
          <Clock className="w-4 h-4" />
          <span>We&apos;ll automatically redirect you when ready</span>
        </div>

        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 text-sm underline"
        >
          Try a different email
        </button>
      </div>
    </div>
  )
}

// Loading State Component
function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Setting up your session...</p>
      </div>
    </div>
  )
}
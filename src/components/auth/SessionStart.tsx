'use client'

import React, { useState, useEffect } from 'react'
import { Mail, Bot, CheckCircle } from 'lucide-react'
import { useRecaptcha } from '@/lib/security/useRecaptcha'
import QueueStatus from './QueueStatus'

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

  const handleQueueActivated = (sessionData: { sessionId?: string; wasActivated?: boolean }) => {
    // Store session token and redirect to chat
    if (sessionData.sessionId && sessionStatus.sessionToken) {
      localStorage.setItem('sessionToken', sessionStatus.sessionToken)
      window.location.href = `/chat?token=${sessionStatus.sessionToken}`
    }
  }

  if (sessionStatus.status === 'queued') {
    return <QueueStatus 
      sessionToken={sessionStatus.sessionToken!}
      initialQueuePosition={sessionStatus.queuePosition}
      initialEstimatedWait={sessionStatus.estimatedWaitMinutes}
      onActivated={handleQueueActivated}
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
          <p><a href="/privacy" className="text-blue-500 hover:text-blue-600 underline">Privacy Policy</a></p>
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
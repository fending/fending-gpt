'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

interface SessionManagerProps {
  sessionToken: string
  onSessionExpired?: () => void
}

const INACTIVITY_TIMEOUT = 10 * 60 * 1000 // 10 minutes in milliseconds
const WARNING_THRESHOLD = 1 * 60 * 1000 // 1 minute warning in milliseconds
const ACTIVITY_UPDATE_INTERVAL = 30 * 1000 // Update activity every 30 seconds

export default function SessionManager({ sessionToken, onSessionExpired }: SessionManagerProps) {
  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(INACTIVITY_TIMEOUT)
  const [isActive, setIsActive] = useState(true)
  
  const lastActivityRef = useRef(Date.now())
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    setIsActive(true)
    setShowWarning(false)
    
    // Clear existing timeouts
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
      warningTimeoutRef.current = null
    }
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current)
      activityTimeoutRef.current = null
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }

    // Set warning timeout (after 9 minutes of inactivity, start 1-minute warning)
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true)
      setTimeRemaining(WARNING_THRESHOLD) // Start 1-minute countdown
      
      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1000
          if (newTime <= 0) {
            // Session expired
            setIsActive(false)
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current)
              countdownIntervalRef.current = null
            }
            onSessionExpired?.()
            return 0
          }
          return newTime
        })
      }, 1000)
      
    }, INACTIVITY_TIMEOUT - WARNING_THRESHOLD)

    // Set session expiry timeout (10 minutes from now)
    activityTimeoutRef.current = setTimeout(() => {
      setIsActive(false)
      onSessionExpired?.()
    }, INACTIVITY_TIMEOUT)

  }, [onSessionExpired])

  // Send activity update to server
  const sendActivityUpdate = useCallback(async () => {
    if (!sessionToken || !isActive) return
    
    try {
      await fetch(`/api/session/activity?token=${sessionToken}`, {
        method: 'POST'
      })
    } catch (error) {
      console.error('Failed to update session activity:', error)
    }
  }, [sessionToken, isActive])

  // Stay active function
  const stayActive = useCallback(() => {
    updateActivity()
    sendActivityUpdate()
  }, [updateActivity, sendActivityUpdate])

  // Activity event handlers
  const handleActivity = useCallback(() => {
    updateActivity()
  }, [updateActivity])

  // Set up activity listeners
  useEffect(() => {
    const events = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 
      'touchstart', 'click', 'focus', 'visibilitychange'
    ]

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    // Initial activity update
    updateActivity()

    // Set up periodic activity updates to server
    updateIntervalRef.current = setInterval(sendActivityUpdate, ACTIVITY_UPDATE_INTERVAL)

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
        warningTimeoutRef.current = null
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
        activityTimeoutRef.current = null
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
        updateIntervalRef.current = null
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }
  }, [handleActivity, sendActivityUpdate, updateActivity])

  // Format time remaining
  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (!showWarning) return null

  return (
    <div className="fixed top-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg z-50 max-w-sm">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-yellow-800">Session Timeout Warning</h4>
          <p className="text-sm text-yellow-700 mt-1">
            Your session will end in <span className="font-mono font-bold">{formatTime(timeRemaining)}</span> due to inactivity.
          </p>
          <div className="mt-3 flex space-x-2">
            <button
              onClick={stayActive}
              className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
            >
              Stay Active
            </button>
            <button
              onClick={() => setShowWarning(false)}
              className="text-yellow-600 px-3 py-1 rounded text-sm hover:text-yellow-800 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3 w-full bg-yellow-200 rounded-full h-1">
        <div 
          className="bg-yellow-600 h-1 rounded-full transition-all duration-1000 ease-linear"
          style={{ 
            width: `${(timeRemaining / WARNING_THRESHOLD) * 100}%` 
          }}
        />
      </div>
    </div>
  )
}
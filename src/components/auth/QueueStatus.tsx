'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Users, Clock, CheckCircle } from 'lucide-react'

interface QueueStatusProps {
  sessionToken: string
  initialQueuePosition?: number
  initialEstimatedWait?: number
  onActivated: (sessionData: { sessionId?: string; wasActivated?: boolean }) => void
}

interface QueueData {
  status: 'queued' | 'active' | 'expired' | 'pending'
  queuePosition?: number
  estimatedWaitMinutes?: number
  activeSessions?: number
  maxSessions?: number
  wasActivated?: boolean
}

export default function QueueStatus({ 
  sessionToken, 
  initialQueuePosition, 
  initialEstimatedWait,
  onActivated 
}: QueueStatusProps) {
  const [queueData, setQueueData] = useState<QueueData>({
    status: 'queued',
    queuePosition: initialQueuePosition,
    estimatedWaitMinutes: initialEstimatedWait
  })
  const [isPolling, setIsPolling] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const checkQueueStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/session/queue-status?token=${sessionToken}`)
      const data = await response.json()

      if (!response.ok) {
        console.error('Queue status error:', data.error)
        return
      }

      setQueueData(data)

      // If session was activated, notify parent and stop polling
      if (data.status === 'active' || data.wasActivated) {
        setIsPolling(false)
        onActivated(data)
      }
    } catch (error) {
      console.error('Error checking queue status:', error)
    }
  }, [sessionToken, onActivated, setIsPolling, setQueueData])

  useEffect(() => {
    if (!isPolling) return

    // Initial check
    checkQueueStatus()

    // Set up polling every 10 seconds
    intervalRef.current = setInterval(checkQueueStatus, 10000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [sessionToken, isPolling, checkQueueStatus])

  const formatWaitTime = (minutes?: number) => {
    if (!minutes) return 'Calculating...'
    if (minutes < 1) return 'Less than 1 minute'
    if (minutes === 1) return '1 minute'
    if (minutes < 60) return `${minutes} minutes`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (remainingMinutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
    return `${hours}h ${remainingMinutes}m`
  }

  if (queueData.status === 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re In!</h2>
          <p className="text-gray-600 mb-6">
            Your chat session is now active. Redirecting you to the conversation...
          </p>
          <div className="animate-pulse bg-blue-100 rounded-lg p-3">
            <p className="text-blue-800 text-sm">Loading chat interface...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">You&apos;re in the Queue</h2>
          <p className="text-gray-600 mt-2">
            We&apos;ll automatically start your chat session when a spot opens up.
          </p>
        </div>

        <div className="space-y-6">
          {/* Queue Position */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-800 font-bold text-lg">
                    {queueData.queuePosition || '?'}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Your Position</h3>
                  <p className="text-sm text-gray-600">in the queue</p>
                </div>
              </div>
            </div>
          </div>

          {/* Estimated Wait Time */}
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Clock className="w-6 h-6 text-purple-600" />
              <div>
                <h3 className="font-medium text-gray-900">Estimated Wait</h3>
                <p className="text-lg font-semibold text-purple-800">
                  {formatWaitTime(queueData.estimatedWaitMinutes)}
                </p>
              </div>
            </div>
          </div>

          {/* System Status */}
          {queueData.activeSessions !== undefined && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Active Sessions</span>
                <span className="font-medium text-gray-900">
                  {queueData.activeSessions} / {queueData.maxSessions}
                </span>
              </div>
            </div>
          )}

          {/* Auto-refresh indicator */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Auto-updating every 10 seconds</span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-xs text-gray-400 text-center">
          <p>Keep this page open to maintain your queue position</p>
          <p className="mt-1">
            <strong>Questions?</strong> <a href="https://www.brianfending.com/contact" className="text-blue-600 hover:underline">Contact Brian</a>
          </p>
        </div>
      </div>
    </div>
  )
}
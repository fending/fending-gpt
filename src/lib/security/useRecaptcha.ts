'use client'

import { useState, useCallback } from 'react'
import { executeRecaptcha } from './recaptcha'

export function useRecaptcha() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (action: string = 'session_request'): Promise<string | null> => {
    // Skip reCAPTCHA in development
    if (process.env.NODE_ENV === 'development') {
      console.log('DEV: Skipping reCAPTCHA verification for localhost')
      return 'dev-bypass-token'
    }

    setLoading(true)
    setError(null)

    try {
      const token = await executeRecaptcha(action)
      return token
    } catch (err) {
      const message = err instanceof Error ? err.message : 'reCAPTCHA failed'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { execute, loading, error }
}
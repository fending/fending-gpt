'use client'

import { useState, useCallback } from 'react'

interface ToastMessage {
  id: string
  title?: string
  description?: string
  type?: 'success' | 'error' | 'warning' | 'info'
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback(
    (message: string | Omit<ToastMessage, 'id'>) => {
      if (typeof message === 'string') {
        addToast({ description: message })
      } else {
        addToast(message)
      }
    },
    [addToast]
  )

  const success = useCallback(
    (message: string) => {
      addToast({ description: message, type: 'success' })
    },
    [addToast]
  )

  const error = useCallback(
    (message: string) => {
      addToast({ description: message, type: 'error' })
    },
    [addToast]
  )

  const warning = useCallback(
    (message: string) => {
      addToast({ description: message, type: 'warning' })
    },
    [addToast]
  )

  return {
    toasts,
    toast,
    success,
    error,
    warning,
    removeToast,
  }
}
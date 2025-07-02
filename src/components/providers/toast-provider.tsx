'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useToast } from '@/hooks/useToast'
import { Toast } from '@/components/ui/toast'

interface ToastContextType {
  toast: (message: string | { title?: string; description?: string; type?: 'success' | 'error' | 'warning' | 'info' }) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToastContext() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const { toasts, toast, success, error, warning, removeToast } = useToast()

  return (
    <ToastContext.Provider value={{ toast, success, error, warning }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            title={toast.title}
            description={toast.description}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
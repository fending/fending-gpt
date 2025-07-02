'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface ToastProps {
  title?: string
  description?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  onClose: () => void
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ title, description, type = 'info', onClose, ...props }, ref) => {
    const typeStyles = {
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800',
    }

    React.useEffect(() => {
      const timer = setTimeout(() => {
        onClose()
      }, 5000)

      return () => clearTimeout(timer)
    }, [onClose])

    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full rounded-lg border p-4 shadow-lg',
          typeStyles[type]
        )}
        {...props}
      >
        <div className="flex">
          <div className="flex-1">
            {title && <div className="font-medium">{title}</div>}
            {description && (
              <div className={cn('text-sm', title && 'mt-1')}>
                {description}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-2 flex-shrink-0 rounded-md p-1 hover:bg-black/5 focus:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }
)
Toast.displayName = 'Toast'

export { Toast }
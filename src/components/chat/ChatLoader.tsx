'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface ChatLoaderProps {
  onAbort: () => void
  onAbortComplete?: (originalMessage: string) => void
  originalMessage?: string
}

const LOADER_PHRASES = {
  quick: [
    "Thinking",
    "Cogitating", 
    "Pondering",
    "Thinking really hard"
  ],
  normal: [
    "Making the donuts",
    "Sous vide takes time",
    "Taking this dog for a walk",
    "Herding the kitties",
    "Hold my beer",
    "Brewing the coffee",
    "Connecting dots"
  ],
  detailed: [
    "Reading between the lines",
    "Consulting the manual",
    "Asking the rubber duck",
    "Following breadcrumbs",
    "Piecing this together",
    "Getting my bearings",
    "Chasing down leads",
    "Cross-referencing the encyclopedia",
    "Double-checking my work"
  ],
  working: [
    "Untangling some yarn",
    "Feeding the hamsters", 
    "Winding the clockwork",
    "Sharpening the pencils",
    "Tuning the piano",
    "Adjusting the telescope",
    "Calibrating the instruments",
    "Reasoning like a caged monkey"
  ],
  slow: [
    "OMG I told him we needed a faster database",
    "You have asked a great deal of me"
  ],
  verySlow: [
    "Seriously, at this point thanks for waiting but I just don't know how well this is going to go",
    "I cannot believe it is taking this long",
    "Doing the taxes"
  ]
}

const PHASE_DURATIONS = {
  quick: 2000,    // 0-2s
  normal: 3000,   // 2-5s  
  detailed: 3000, // 5-8s
  working: 7000,  // 8-15s
  slow: 7000,     // 8-15s (mixed with working)
  verySlow: Infinity // 15s+
}

export default function ChatLoader({ onAbort, onAbortComplete, originalMessage = "" }: ChatLoaderProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [currentPhrase, setCurrentPhrase] = useState("")
  const [showAborted, setShowAborted] = useState(false)
  const [/* minDisplayMet */, setMinDisplayMet] = useState(false)

  // Determine current phase based on elapsed time
  const getCurrentPhase = (elapsed: number) => {
    if (elapsed < PHASE_DURATIONS.quick) return 'quick'
    if (elapsed < PHASE_DURATIONS.quick + PHASE_DURATIONS.normal) return 'normal'
    if (elapsed < PHASE_DURATIONS.quick + PHASE_DURATIONS.normal + PHASE_DURATIONS.detailed) return 'detailed'
    if (elapsed < 8000) return 'working'
    if (elapsed < 15000) return 'slow'
    return 'verySlow'
  }

  // Get random phrase from current phase
  const getRandomPhrase = (phase: keyof typeof LOADER_PHRASES) => {
    const phrases = LOADER_PHRASES[phase]
    return phrases[Math.floor(Math.random() * phrases.length)]
  }

  // Handle abort with message
  const handleAbort = () => {
    setShowAborted(true)
    onAbort()
    
    // Show abort message briefly, then call completion
    setTimeout(() => {
      onAbortComplete?.(originalMessage)
    }, 1500)
  }

  useEffect(() => {
    // Minimum display time tracker
    const minDisplayTimer = setTimeout(() => {
      setMinDisplayMet(true)
    }, 1500)

    // Main timer for elapsed time and phrase rotation
    const interval = setInterval(() => {
      setElapsedTime(prev => {
        const newElapsed = prev + 100
        
        // Update phrase every 1.5 seconds
        if (newElapsed % 1500 === 0) {
          const phase = getCurrentPhase(newElapsed)
          setCurrentPhrase(getRandomPhrase(phase))
        }
        
        return newElapsed
      })
    }, 100)

    // Set initial phrase
    setCurrentPhrase(getRandomPhrase('quick'))

    return () => {
      clearTimeout(minDisplayTimer)
      clearInterval(interval)
    }
  }, [])

  // Show abort message
  if (showAborted) {
    return (
      <div className="flex gap-3 p-4 bg-gray-50">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
          ✓
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm mb-1">Assistant</div>
          <div className="text-gray-700">Phew. Thanks for calling it.</div>
        </div>
      </div>
    )
  }

  const currentPhase = getCurrentPhase(elapsedTime)
  const showAbortButton = elapsedTime >= 15000

  return (
    <div className="flex gap-3 p-4 bg-gray-50">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
        <div className="animate-pulse">🤖</div>
      </div>
      <div className="flex-1">
        <div className="font-medium text-sm mb-1">Assistant</div>
        <div className="flex items-center justify-between">
          <div className="text-gray-700 flex items-center">
            <span className="animate-pulse mr-2">•</span>
            {currentPhrase}
            {currentPhase === 'verySlow' && (
              <span className="text-xs text-gray-500 ml-2">
                ({Math.round(elapsedTime / 1000)}s)
              </span>
            )}
          </div>
          
          {showAbortButton && (
            <button
              onClick={handleAbort}
              className="ml-4 px-3 py-1 text-xs bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200 flex items-center space-x-1"
            >
              <X className="h-3 w-3" />
              <span>Abort</span>
            </button>
          )}
        </div>
        
        {/* Subtle progress indication for very long waits */}
        {elapsedTime >= 8000 && (
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all duration-1000 ease-out"
              style={{ 
                width: elapsedTime >= 15000 ? '100%' : `${Math.min(((elapsedTime - 8000) / 7000) * 100, 100)}%` 
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
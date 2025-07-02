'use client'

import { useState } from 'react'
import ConversationList from '@/components/chat/ConversationList'
import { Menu, X } from 'lucide-react'

interface SidebarProps {
  selectedConversationId?: string
  onSelectConversation: (conversationId: string) => void
  onNewConversation: () => void
}

export default function Sidebar({
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-80 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-full pt-16 lg:pt-0">
          <ConversationList
            selectedConversationId={selectedConversationId}
            onSelectConversation={(id) => {
              onSelectConversation(id)
              setIsOpen(false)
            }}
            onNewConversation={() => {
              onNewConversation()
              setIsOpen(false)
            }}
          />
        </div>
      </div>
    </>
  )
}
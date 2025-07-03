'use client'

import { useState, useEffect, useCallback } from 'react'
import { Conversation } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Plus, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

interface ConversationListProps {
  selectedConversationId?: string
  onSelectConversation: (conversationId: string) => void
  onNewConversation: () => void
}

export default function ConversationList({
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchConversations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setConversations(data || [])
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <Button onClick={onNewConversation} className="w-full" variant="outline">
          <Plus size={16} className="mr-2" />
          New Conversation
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare size={48} className="mx-auto mb-2 opacity-30" />
            <p>No conversations yet</p>
            <p className="text-sm">Start a new conversation to get started</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`w-full text-left p-3 rounded-md hover:bg-gray-100 transition-colors ${
                  selectedConversationId === conversation.id ? 'bg-blue-50 border border-blue-200' : ''
                }`}
              >
                <div className="font-medium text-sm truncate mb-1">
                  {conversation.title}
                </div>
                <div className="text-xs text-gray-500">
                  {format(new Date(conversation.updated_at), 'MMM d, h:mm a')}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Star, MessageSquare, User, Bot, ArrowRight, Check, Sparkles } from 'lucide-react'

interface ExtractedKnowledgeEntry {
  category: string
  title: string
  content: string
  tags: string[]
}

interface TrainingConversation {
  id: string
  session_id: string
  email: string
  user_message: string
  ai_response: string
  question_type: string | null
  confidence_score: number | null
  response_time_ms: number | null
  created_at: string
  quality_rating: number | null
  is_approved: boolean
  admin_notes: string | null
  extracted_knowledge: ExtractedKnowledgeEntry[] | null
}


interface TrainingInterfaceProps {
  onSuggestKnowledge?: (data: {
    category: string
    title: string
    content: string
    tags: string[]
    priority: number
  }) => void
}

export default function TrainingInterface({ onSuggestKnowledge }: TrainingInterfaceProps) {
  const [conversations, setConversations] = useState<TrainingConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<TrainingConversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedExtractedEntries, setSelectedExtractedEntries] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken')
      const response = await fetch(`/api/admin/training?token=${sessionToken}`)
      if (!response.ok) throw new Error('Failed to fetch conversations')
      const data = await response.json()
      setConversations(data)
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateConversationRating = async (conversationId: string, rating: number, notes: string = '') => {
    try {
      const sessionToken = localStorage.getItem('sessionToken')
      const response = await fetch(`/api/admin/training`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          conversationId,
          quality_rating: rating,
          admin_notes: notes,
          is_approved: rating >= 4
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Server error:', errorData)
        throw new Error(`Failed to update conversation: ${response.status}`)
      }

      // Update local state
      setConversations(conversations.map(conv =>
        conv.id === conversationId
          ? { ...conv, quality_rating: rating, admin_notes: notes, is_approved: rating >= 4 }
          : conv
      ))
    } catch (error) {
      console.error('Error updating conversation:', error)
      alert(`Error updating conversation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const hasExtractedKnowledge = selectedConversation?.extracted_knowledge &&
    selectedConversation.extracted_knowledge.length > 0

  const toggleExtractedEntry = (index: number) => {
    setSelectedExtractedEntries(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const suggestExtractedEntries = () => {
    if (!selectedConversation?.extracted_knowledge || !onSuggestKnowledge) return

    const entries = selectedConversation.extracted_knowledge
    const indicesToSend = selectedExtractedEntries.size > 0
      ? Array.from(selectedExtractedEntries)
      : entries.map((_, i) => i) // Send all if none explicitly selected

    indicesToSend.forEach(index => {
      const entry = entries[index]
      if (entry) {
        onSuggestKnowledge({
          category: entry.category,
          title: entry.title,
          content: entry.content,
          tags: entry.tags || [],
          priority: selectedConversation.quality_rating || 3,
        })
      }
    })

    // Reset selection after sending
    setSelectedExtractedEntries(new Set())
  }

  const suggestForKnowledgeBase = () => {
    if (!selectedConversation || !onSuggestKnowledge) return

    // If extracted knowledge exists, use the extracted entries flow
    if (hasExtractedKnowledge) {
      suggestExtractedEntries()
      return
    }

    // Fallback: build suggestion from raw Q&A text
    const suggestedTitle = selectedConversation.user_message.length > 50
      ? selectedConversation.user_message.substring(0, 50) + '...'
      : selectedConversation.user_message

    const suggestedContent = `Q: ${selectedConversation.user_message}\n\nA: ${selectedConversation.ai_response}`

    // Determine category based on question content
    let suggestedCategory = 'experience'
    const question = selectedConversation.user_message.toLowerCase()
    if (question.includes('skill') || question.includes('technology')) {
      suggestedCategory = 'skills'
    } else if (question.includes('project') || question.includes('built') || question.includes('develop')) {
      suggestedCategory = 'projects'
    } else if (question.includes('resume') || question.includes('cv')) {
      suggestedCategory = 'resume'
    } else if (question.includes('company') || question.includes('work') || question.includes('team')) {
      suggestedCategory = 'company'
    } else if (question.includes('personal') || question.includes('about you')) {
      suggestedCategory = 'personal'
    }

    // Extract potential tags from the question
    const potentialTags: string[] = []
    const commonSkills = ['javascript', 'python', 'react', 'node', 'aws', 'docker', 'kubernetes', 'typescript', 'sql']
    commonSkills.forEach(skill => {
      if (question.includes(skill)) {
        potentialTags.push(skill)
      }
    })

    onSuggestKnowledge({
      category: suggestedCategory,
      title: suggestedTitle,
      content: suggestedContent,
      tags: potentialTags,
      priority: selectedConversation.quality_rating || 3
    })
  }


  const getQualityColor = (rating: number | null) => {
    if (!rating) return 'text-gray-400'
    if (rating >= 4) return 'text-green-600'
    if (rating >= 3) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceColor = (confidence: number | null) => {
    if (!confidence) return 'text-gray-400'
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Training Interface</h2>
        <p className="text-gray-600">
          Review conversations to improve the AI&apos;s knowledge base. Rate conversations and extract valuable insights.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversations List */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Recent Conversations ({conversations.length})
            </h3>
          </div>
          <div className="h-96 overflow-y-auto">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => { setSelectedConversation(conversation); setSelectedExtractedEntries(new Set()) }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {conversation.email || 'Anonymous'}
                  </span>
                  <div className="flex items-center space-x-2">
                    {conversation.quality_rating && (
                      <div className={`flex items-center ${getQualityColor(conversation.quality_rating)}`}>
                        <Star className="h-4 w-4 mr-1" />
                        <span className="text-xs">{conversation.quality_rating}</span>
                      </div>
                    )}
                    {conversation.confidence_score && (
                      <span className={`text-xs ${getConfidenceColor(conversation.confidence_score)}`}>
                        {Math.round(conversation.confidence_score * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 truncate mb-1">{conversation.user_message}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(conversation.created_at), { addSuffix: true })}
                  </span>
                  {conversation.question_type && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {conversation.question_type}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversation Details & Training */}
        <div className="space-y-6">
          {selectedConversation ? (
            <>
              {/* Conversation Details */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Conversation Details</h3>

                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <User className="h-5 w-5 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">User Question</p>
                      <p className="text-sm text-gray-600">{selectedConversation.user_message}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Bot className="h-5 w-5 text-green-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">AI Response</p>
                      <p className="text-sm text-gray-600">{selectedConversation.ai_response}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500">Confidence</p>
                      <p className={`text-sm font-medium ${getConfidenceColor(selectedConversation.confidence_score)}`}>
                        {selectedConversation.confidence_score
                          ? `${Math.round(selectedConversation.confidence_score * 100)}%`
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Response Time</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedConversation.response_time_ms
                          ? `${selectedConversation.response_time_ms}ms`
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rating Controls */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-3">Rate this conversation:</p>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => updateConversationRating(selectedConversation.id, rating)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                          selectedConversation.quality_rating === rating
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : 'border-gray-300 text-gray-600 hover:border-blue-500'
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                  {selectedConversation.quality_rating && (
                    <p className="text-xs text-gray-500 mt-2">
                      {selectedConversation.quality_rating >= 4 ? 'Approved for training' : 'Needs improvement'}
                    </p>
                  )}
                </div>

                {/* Extracted Knowledge Entries */}
                {hasExtractedKnowledge && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2 mb-3">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <p className="text-sm font-medium text-gray-900">
                        Extracted Knowledge ({selectedConversation!.extracted_knowledge!.length} entries)
                      </p>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedConversation!.extracted_knowledge!.map((entry, index) => (
                        <div
                          key={index}
                          onClick={() => toggleExtractedEntry(index)}
                          className={`p-2 rounded border cursor-pointer text-sm transition-colors ${
                            selectedExtractedEntries.has(index)
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                  {entry.category}
                                </span>
                                <span className="font-medium text-gray-900 truncate">{entry.title}</span>
                              </div>
                              <p className="text-gray-600 mt-1 line-clamp-2">{entry.content}</p>
                              {entry.tags && entry.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {entry.tags.map(tag => (
                                    <span key={tag} className="text-xs text-gray-400">#{tag}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            {selectedExtractedEntries.has(index) && (
                              <Check className="h-4 w-4 text-green-600 flex-shrink-0 ml-2" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Click entries to select. If none selected, all will be sent.
                    </p>
                  </div>
                )}

                {/* Suggest for Knowledge Base */}
                <div className={`mt-4 ${!hasExtractedKnowledge ? 'pt-4 border-t border-gray-200' : ''}`}>
                  <button
                    onClick={suggestForKnowledgeBase}
                    disabled={!onSuggestKnowledge}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-300 flex items-center justify-center space-x-2"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span>
                      {hasExtractedKnowledge
                        ? `Send ${selectedExtractedEntries.size > 0 ? selectedExtractedEntries.size : selectedConversation!.extracted_knowledge!.length} to Knowledge Base`
                        : 'Suggest for Knowledge Base'}
                    </span>
                  </button>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    {hasExtractedKnowledge
                      ? 'Send AI-extracted entries to the knowledge base'
                      : 'Extract insights from this conversation for the knowledge base'}
                  </p>
                </div>
              </div>

            </>
          ) : (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select a conversation to review and extract knowledge</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

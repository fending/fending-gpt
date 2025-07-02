'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminStats from './AdminStats'
import UsersList from './UsersList'
import SessionsList from './SessionsList'
import TrainingInterface from './TrainingInterface'
import KnowledgeBase from './KnowledgeBase'
import { BarChart3, Users, Settings, Monitor, BookOpen, Database, MessageSquare } from 'lucide-react'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'sessions' | 'training' | 'knowledge'>('stats')
  const router = useRouter()
  const [suggestedKnowledge, setSuggestedKnowledge] = useState<{
    category: string
    title: string
    content: string
    tags: string[]
    priority: number
  } | null>(null)

  const handleSuggestKnowledge = (data: {
    category: string
    title: string
    content: string
    tags: string[]
    priority: number
  }) => {
    setSuggestedKnowledge(data)
    setActiveTab('knowledge')
  }

  const handleKnowledgeDataUsed = () => {
    setSuggestedKnowledge(null)
  }

  const tabs = [
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'sessions', label: 'Sessions', icon: Monitor },
    { id: 'training', label: 'Training', icon: BookOpen },
    { id: 'knowledge', label: 'Knowledge Base', icon: Database },
  ]

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white shadow flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-indigo-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <button
              onClick={() => router.push('/chat')}
              className="text-sm text-white bg-blue-800 hover:bg-blue-900 px-3 py-1 rounded flex items-center space-x-1"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Chat</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col">
          <div className="py-8 flex-shrink-0">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'stats' | 'users' | 'sessions' | 'training' | 'knowledge')}
                  className={`flex items-center px-1 py-2 text-sm font-medium border-b-2 ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto pb-8">
            {activeTab === 'stats' && <AdminStats />}
            {activeTab === 'users' && <UsersList />}
            {activeTab === 'sessions' && <SessionsList />}
            {activeTab === 'training' && <TrainingInterface onSuggestKnowledge={handleSuggestKnowledge} />}
            {activeTab === 'knowledge' && <KnowledgeBase prefilledData={suggestedKnowledge || undefined} onDataUsed={handleKnowledgeDataUsed} />}
          </div>
        </div>
      </div>
    </div>
  )
}
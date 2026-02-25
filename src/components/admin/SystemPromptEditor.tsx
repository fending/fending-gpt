'use client'

import { useEffect, useState } from 'react'
import { Save, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface SystemConfig {
  id: string
  key: string
  value: string
  description: string | null
  version: number
  updated_by: string | null
  created_at: string
  updated_at: string
}

export default function SystemPromptEditor() {
  const [config, setConfig] = useState<SystemConfig | null>(null)
  const [promptValue, setPromptValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken')
      const response = await fetch(`/api/admin/config?key=system_prompt&token=${sessionToken}`)
      if (!response.ok) throw new Error('Failed to fetch system prompt')
      const data: SystemConfig = await response.json()
      setConfig(data)
      setPromptValue(data.value)
    } catch (error) {
      console.error('Error fetching system prompt:', error)
      setSaveMessage({ type: 'error', text: 'Failed to load system prompt from database.' })
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    if (!promptValue.trim()) {
      setSaveMessage({ type: 'error', text: 'System prompt cannot be empty.' })
      return
    }

    setSaving(true)
    setSaveMessage(null)

    try {
      const sessionToken = localStorage.getItem('sessionToken')
      const response = await fetch(`/api/admin/config?token=${sessionToken}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'system_prompt', value: promptValue })
      })

      if (!response.ok) throw new Error('Failed to save system prompt')

      const data = await response.json()
      setConfig(data.config)
      setSaveMessage({ type: 'success', text: 'System prompt saved successfully.' })

      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Error saving system prompt:', error)
      setSaveMessage({ type: 'error', text: 'Failed to save system prompt.' })
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = config ? promptValue !== config.value : false

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">System Prompt</h2>
            <p className="text-gray-600">
              Edit the system prompt used by the AI assistant. Changes take effect within 5 minutes.
            </p>
          </div>
          {config && (
            <div className="text-right text-sm text-gray-500">
              <p>Version {config.version}</p>
              {config.updated_by && (
                <p>Last updated by {config.updated_by}</p>
              )}
              <p>{formatDistanceToNow(new Date(config.updated_at), { addSuffix: true })}</p>
            </div>
          )}
        </div>

        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Template placeholder</p>
            <p>
              Use <code className="bg-amber-100 px-1 rounded">{'{{RAG_CONTEXT}}'}</code> where
              the knowledge base context should be injected. This gets replaced at runtime with
              relevant knowledge entries for each conversation.
            </p>
          </div>
        </div>

        <textarea
          value={promptValue}
          onChange={(e) => setPromptValue(e.target.value)}
          rows={24}
          className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter the system prompt..."
        />

        {saveMessage && (
          <div className={`mt-3 p-3 rounded-md text-sm ${
            saveMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {saveMessage.text}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={saveConfig}
            disabled={saving || !hasChanges}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-white ${
              saving || !hasChanges
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

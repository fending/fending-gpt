'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Shield, Plus, Trash2, AlertTriangle, CheckCircle, X, Save } from 'lucide-react'

interface SuppressionEntry {
  id: string
  email: string
  type: 'blacklist' | 'whitelist'
  reason: string | null
  added_by: string | null
  added_at: string
  expires_at: string | null
  is_active: boolean
}

interface RateLimit {
  id: string
  identifier: string
  type: 'ip' | 'email'
  count: number
  window_start: string
  blocked_until: string | null
  last_attempt: string
}

export default function SuppressionManagement() {
  const [suppressions, setSuppressions] = useState<SuppressionEntry[]>([])
  const [rateLimits, setRateLimits] = useState<RateLimit[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'suppressions' | 'rateLimits'>('suppressions')
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    type: 'blacklist' as 'blacklist' | 'whitelist',
    reason: '',
    expires_at: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken')
      
      const [suppressionsRes, rateLimitsRes] = await Promise.all([
        fetch(`/api/admin/suppressions?token=${sessionToken}`),
        fetch(`/api/admin/rate-limits?token=${sessionToken}`)
      ])

      if (suppressionsRes.ok) {
        const suppressionsData = await suppressionsRes.json()
        setSuppressions(suppressionsData)
      }

      if (rateLimitsRes.ok) {
        const rateLimitsData = await rateLimitsRes.json()
        setRateLimits(rateLimitsData)
      }
    } catch (error) {
      console.error('Error fetching suppression data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addSuppression = async () => {
    if (!formData.email || !formData.reason) {
      alert('Email and reason are required')
      return
    }

    try {
      const sessionToken = localStorage.getItem('sessionToken')
      const response = await fetch('/api/admin/suppressions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase(),
          type: formData.type,
          reason: formData.reason,
          expires_at: formData.expires_at || null
        })
      })

      if (!response.ok) throw new Error('Failed to add suppression')
      
      resetForm()
      await fetchData()
      
    } catch (error) {
      console.error('Error adding suppression:', error)
      alert('Failed to add suppression')
    }
  }

  const removeSuppression = async (suppressionId: string) => {
    if (!confirm('Are you sure you want to remove this suppression?')) return

    try {
      const sessionToken = localStorage.getItem('sessionToken')
      const response = await fetch(`/api/admin/suppressions/${suppressionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      })

      if (!response.ok) throw new Error('Failed to remove suppression')
      
      await fetchData()
    } catch (error) {
      console.error('Error removing suppression:', error)
      alert('Failed to remove suppression')
    }
  }

  const clearRateLimit = async (rateLimitId: string) => {
    if (!confirm('Clear this rate limit?')) return

    try {
      const sessionToken = localStorage.getItem('sessionToken')
      const response = await fetch(`/api/admin/rate-limits/${rateLimitId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      })

      if (!response.ok) throw new Error('Failed to clear rate limit')
      
      await fetchData()
    } catch (error) {
      console.error('Error clearing rate limit:', error)
      alert('Failed to clear rate limit')
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      type: 'blacklist',
      reason: '',
      expires_at: ''
    })
    setShowAddForm(false)
  }

  const getSuppressionIcon = (type: string) => {
    return type === 'whitelist' ? 
      <CheckCircle className="h-4 w-4 text-green-600" /> : 
      <Shield className="h-4 w-4 text-red-600" />
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Suppression Management</h2>
            <p className="text-gray-600">
              Manage email suppressions and rate limiting controls.
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Suppression</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-4">
          <button
            onClick={() => setActiveTab('suppressions')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'suppressions'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Email Suppressions ({suppressions.filter(s => s.is_active).length})
          </button>
          <button
            onClick={() => setActiveTab('rateLimits')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'rateLimits'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Rate Limits ({rateLimits.filter(r => r.blocked_until).length} blocked)
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Add Email Suppression</h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'blacklist' | 'whitelist' })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="blacklist">Blacklist (Block)</option>
                  <option value="whitelist">Whitelist (Allow)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason
              </label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Reason for suppression"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expires At (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for permanent suppression</p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addSuppression}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Add Suppression</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'suppressions' ? (
        <div className="bg-white shadow rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Email Suppressions
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {suppressions.filter(s => s.is_active).map((suppression) => (
              <div key={suppression.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    {getSuppressionIcon(suppression.type)}
                    <div>
                      <p className="font-medium text-gray-900">{suppression.email}</p>
                      <p className="text-sm text-gray-600">{suppression.reason}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <span>Added by: {suppression.added_by || 'System'}</span>
                        <span>{formatDistanceToNow(new Date(suppression.added_at), { addSuffix: true })}</span>
                        {suppression.expires_at && (
                          <span>Expires: {new Date(suppression.expires_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeSuppression(suppression.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {suppressions.filter(s => s.is_active).length === 0 && (
              <div className="p-6 text-center text-gray-500">
                <Shield className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No active suppressions</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Rate Limits
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {rateLimits.map((rateLimit) => (
              <div key={rateLimit.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900">{rateLimit.identifier}</p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        rateLimit.type === 'email' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {rateLimit.type}
                      </span>
                      {rateLimit.blocked_until && new Date(rateLimit.blocked_until) > new Date() && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          BLOCKED
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      <p>Requests: {rateLimit.count}</p>
                      <p>Last attempt: {formatDistanceToNow(new Date(rateLimit.last_attempt), { addSuffix: true })}</p>
                      {rateLimit.blocked_until && (
                        <p>Blocked until: {new Date(rateLimit.blocked_until).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => clearRateLimit(rateLimit.id)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ))}
            
            {rateLimits.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No rate limits active</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
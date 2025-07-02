'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface Session {
  id: string
  email: string
  status: string
  created_at: string
  activated_at: string | null
  expires_at: string
  total_cost_usd: number
  total_tokens_used: number
  queue_position: number | null
}

export default function SessionsList() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken')
      const response = await fetch(`/api/admin/sessions?token=${sessionToken}`)
      if (!response.ok) throw new Error('Failed to fetch sessions')
      const data = await response.json()
      setSessions(data)
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      expired: 'bg-gray-100 text-gray-800',
      queued: 'bg-purple-100 text-purple-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Chat Sessions ({sessions.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tokens
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {session.email || 'Anonymous'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(session.status)}`}>
                      {session.status}
                      {session.queue_position && ` (#${session.queue_position})`}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{new Date(session.created_at).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDistanceToNow(new Date(session.expires_at), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${session.total_cost_usd.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {session.total_tokens_used.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sessions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No sessions found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
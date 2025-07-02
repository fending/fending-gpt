'use client'

import { useState, useEffect } from 'react'
import { AdminStats } from '@/types'
import { Users, MessageSquare, Activity, DollarSign } from 'lucide-react'

export default function AdminStatsComponent() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken')
      console.log('Session token:', sessionToken ? 'Present' : 'Missing')
      
      const response = await fetch(`/api/admin/stats?token=${sessionToken}`)
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API error:', errorData)
        throw new Error(`Failed to fetch stats: ${response.status}`)
      }
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center text-red-600">
        Failed to load admin statistics
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Total Conversations',
      value: stats.totalConversations.toLocaleString(),
      icon: MessageSquare,
      color: 'text-green-600',
    },
    {
      title: 'Total Messages',
      value: stats.totalMessages.toLocaleString(),
      icon: Activity,
      color: 'text-purple-600',
    },
    {
      title: 'Total Cost',
      value: `$${stats.totalCostUSD.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-orange-600',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.title} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      {stats.dailyStats.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Daily Activity (Last 7 Days)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-right py-2">Users</th>
                  <th className="text-right py-2">Conversations</th>
                  <th className="text-right py-2">Messages</th>
                  <th className="text-right py-2">Tokens</th>
                  <th className="text-right py-2">Cost</th>
                </tr>
              </thead>
              <tbody>
                {stats.dailyStats.map((day) => (
                  <tr key={day.date} className="border-b">
                    <td className="py-2">{day.date}</td>
                    <td className="text-right py-2">{day.users}</td>
                    <td className="text-right py-2">{day.conversations}</td>
                    <td className="text-right py-2">{day.messages}</td>
                    <td className="text-right py-2">{day.tokens.toLocaleString()}</td>
                    <td className="text-right py-2">${day.cost.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
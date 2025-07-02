'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types'
import { LogOut, Settings, User as UserIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    getUser()
  }, [getUser])

  const getUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()
      
      if (data) {
        setUser(data)
      }
    }
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) return null

  return (
    <header className="bg-white shadow border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              AI Chat Assistant
            </h1>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none"
            >
              <UserIcon className="h-5 w-5" />
              <span className="text-sm">{user.email}</span>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                {user.is_admin && (
                  <button
                    onClick={() => {
                      router.push('/admin')
                      setShowDropdown(false)
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Admin Dashboard
                  </button>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, extractSessionToken } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    // Verify admin access with optimized middleware
    const sessionToken = extractSessionToken(request)
    const authResult = await requireAdmin(sessionToken!)
    
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 500 })
    }

    // Use service role for admin operations (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get unique users with their latest session data
    const { data: allSessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('created_at', { ascending: false })

    if (sessionsError) {
      throw sessionsError
    }

    // Group sessions by email to get unique users
    const userMap = new Map()
    
    allSessions?.forEach(session => {
      const email = session.email || 'Anonymous'
      if (!userMap.has(email) || new Date(session.created_at) > new Date(userMap.get(email).created_at)) {
        userMap.set(email, {
          id: session.id,
          email: session.email,
          created_at: session.created_at, // First session (will be overridden to show latest)
          last_login: session.activated_at || session.created_at, // Most recent activation
          total_sessions: 0,
          total_cost_usd: 0,
          total_tokens_used: 0,
          latest_status: session.status
        })
      }
    })

    // Calculate totals for each unique user
    allSessions?.forEach(session => {
      const email = session.email || 'Anonymous'
      const user = userMap.get(email)
      if (user) {
        user.total_sessions += 1
        user.total_cost_usd += session.total_cost_usd || 0
        user.total_tokens_used += session.total_tokens_used || 0
        
        // Update last_login to the most recent activation
        if (session.activated_at && (!user.last_login || new Date(session.activated_at) > new Date(user.last_login))) {
          user.last_login = session.activated_at
        }
      }
    })

    const uniqueUsers = Array.from(userMap.values())

    return NextResponse.json(uniqueUsers)

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { sessionId, action } = await request.json()

    if (!sessionId || !action) {
      return NextResponse.json(
        { error: 'Session ID and action are required' },
        { status: 400 }
      )
    }

    // Use service role for admin operations (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.replace('Bearer ', '')

    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token required' }, { status: 401 })
    }

    // Get session and email from token
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('email, status, expires_at')
      .eq('token', sessionToken)
      .eq('status', 'active')
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
    }

    // Check if email is in admin_users table
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('email')
      .eq('email', session.email)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Update session status (expire, activate, etc.)
    const updateData: any = {}
    if (action === 'expire') {
      updateData.status = 'expired'
    } else if (action === 'activate') {
      updateData.status = 'active'
    }

    const { error: updateError } = await supabase
      .from('chat_sessions')
      .update(updateData)
      .eq('id', sessionId)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { extractSessionToken } from '@/lib/auth/middleware'

export async function POST(request: NextRequest) {
  try {
    const sessionToken = extractSessionToken(request)
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token required' }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()

    // Update last_activity_at for the session - use service role for write operation
    const { error } = await serviceSupabase
      .from('chat_sessions')
      .update({ 
        last_activity_at: new Date().toISOString() 
      })
      .eq('token', sessionToken)
      .eq('status', 'active')

    if (error) {
      console.error('Error updating session activity:', error)
      return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in activity update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
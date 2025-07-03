import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractSessionToken } from '@/lib/auth/middleware'

export async function POST(request: NextRequest) {
  try {
    const sessionToken = extractSessionToken(request)
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token required' }, { status: 401 })
    }

    const supabase = await createClient()

    // Update last_activity_at for the session
    const { error } = await supabase
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
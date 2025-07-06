import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateSession, extractSessionToken } from '@/lib/auth/middleware'

export async function POST(request: NextRequest) {
  try {
    const token = extractSessionToken(request)
    
    if (!token) {
      return NextResponse.json(
        { error: 'Session token required' },
        { status: 400 }
      )
    }

    const authResult = await validateSession(token)
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 500 }
      )
    }

    const { session } = authResult
    const supabase = await createClient()

    // End the current session
    const { error: endError } = await supabase
      .from('chat_sessions')
      .update({ 
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', session!.id)

    if (endError) {
      console.error('Error ending session:', endError)
      return NextResponse.json(
        { error: 'Failed to end session' },
        { status: 500 }
      )
    }

    // Trigger queue update to activate next sessions
    try {
      await triggerQueueUpdate()
    } catch (queueError) {
      console.error('Error triggering queue update:', queueError)
      // Don't fail the request if queue update fails
    }

    return NextResponse.json({
      message: 'Session ended successfully'
    })

  } catch (error) {
    console.error('Error in session end API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to trigger queue updates
async function triggerQueueUpdate() {
  const supabase = await createClient()

  // Get current active sessions count
  const { count: activeSessions } = await supabase
    .from('chat_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  const MAX_CONCURRENT_SESSIONS = 100
  const slotsAvailable = MAX_CONCURRENT_SESSIONS - (activeSessions || 0)

  if (slotsAvailable > 0) {
    // Get queued sessions in order
    const { data: queuedSessions, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('id, token, queue_position')
      .eq('status', 'queued')
      .order('queue_position', { ascending: true })
      .limit(slotsAvailable)

    if (fetchError) {
      console.error('Error fetching queued sessions:', fetchError)
      return
    }

    if (queuedSessions && queuedSessions.length > 0) {
      // Activate the first sessions in queue
      for (const session of queuedSessions) {
        await supabase
          .from('chat_sessions')
          .update({ 
            status: 'active',
            queue_position: null,
            activated_at: new Date().toISOString()
          })
          .eq('id', session.id)
      }

      console.log(`Activated ${queuedSessions.length} sessions from queue`)

      // Recalculate queue positions for remaining sessions
      const { data: remainingQueued } = await supabase
        .from('chat_sessions')
        .select('id, queue_position')
        .eq('status', 'queued')
        .order('queue_position', { ascending: true })

      if (remainingQueued && remainingQueued.length > 0) {
        for (let i = 0; i < remainingQueued.length; i++) {
          await supabase
            .from('chat_sessions')
            .update({ queue_position: i + 1 })
            .eq('id', remainingQueued[i].id)
        }
      }
    }
  }
}
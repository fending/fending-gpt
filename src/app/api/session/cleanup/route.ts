import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Clean up expired sessions
    const now = new Date().toISOString()
    
    const { data: expiredSessions, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('id, status')
      .lt('expires_at', now)
      .in('status', ['active', 'queued', 'pending'])

    if (fetchError) {
      console.error('Error fetching expired sessions:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch expired sessions' }, { status: 500 })
    }

    if (expiredSessions && expiredSessions.length > 0) {
      // Mark expired sessions as expired
      const { error: expireError } = await supabase
        .from('chat_sessions')
        .update({ 
          status: 'expired',
          ended_at: now
        })
        .lt('expires_at', now)
        .in('status', ['active', 'queued', 'pending'])

      if (expireError) {
        console.error('Error expiring sessions:', expireError)
        return NextResponse.json({ error: 'Failed to expire sessions' }, { status: 500 })
      }

      console.log(`Expired ${expiredSessions.length} sessions`)
    }

    // Trigger queue management after cleanup
    await triggerQueueManagement()

    return NextResponse.json({ 
      message: 'Cleanup completed successfully',
      expiredSessions: expiredSessions?.length || 0
    })

  } catch (error) {
    console.error('Error in session cleanup:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to manage queue after cleanup
async function triggerQueueManagement() {
  const supabase = await createClient()

  // Get current active sessions count
  const { count: activeSessions } = await supabase
    .from('chat_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  const MAX_CONCURRENT_SESSIONS = 5
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
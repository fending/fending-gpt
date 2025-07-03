import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const now = new Date()
    const nowISO = now.toISOString()
    
    // Calculate thresholds
    const inactivityThreshold = new Date(now.getTime() - 5 * 60 * 1000) // 5 minutes ago

    // 1. Clean up sessions that exceeded hard time limit (1 hour)
    const { data: hardExpiredSessions, error: hardFetchError } = await supabase
      .from('chat_sessions')
      .select('id, status')
      .lt('expires_at', nowISO)
      .in('status', ['active', 'queued', 'pending'])

    if (hardFetchError) {
      console.error('Error fetching hard expired sessions:', hardFetchError)
      return NextResponse.json({ error: 'Failed to fetch expired sessions' }, { status: 500 })
    }

    let expiredCount = 0

    if (hardExpiredSessions && hardExpiredSessions.length > 0) {
      // Mark hard expired sessions as expired
      const { error: expireError } = await supabase
        .from('chat_sessions')
        .update({ 
          status: 'expired',
          ended_at: nowISO
        })
        .lt('expires_at', nowISO)
        .in('status', ['active', 'queued', 'pending'])

      if (expireError) {
        console.error('Error expiring hard limit sessions:', expireError)
        return NextResponse.json({ error: 'Failed to expire sessions' }, { status: 500 })
      }

      expiredCount += hardExpiredSessions.length
      console.log(`Hard expired ${hardExpiredSessions.length} sessions (time limit exceeded)`)
    }

    // 2. Clean up sessions inactive for more than 5 minutes
    const { data: inactiveSessions, error: inactiveFetchError } = await supabase
      .from('chat_sessions')
      .select('id, status, last_activity_at')
      .lt('last_activity_at', inactivityThreshold.toISOString())
      .eq('status', 'active')

    if (inactiveFetchError) {
      console.error('Error fetching inactive sessions:', inactiveFetchError)
    } else if (inactiveSessions && inactiveSessions.length > 0) {
      // Mark inactive sessions as expired
      const { error: inactiveExpireError } = await supabase
        .from('chat_sessions')
        .update({ 
          status: 'expired',
          ended_at: nowISO
        })
        .lt('last_activity_at', inactivityThreshold.toISOString())
        .eq('status', 'active')

      if (inactiveExpireError) {
        console.error('Error expiring inactive sessions:', inactiveExpireError)
      } else {
        expiredCount += inactiveSessions.length
        console.log(`Expired ${inactiveSessions.length} sessions due to inactivity`)
      }
    }

    // Trigger queue management after cleanup
    await triggerQueueManagement()

    return NextResponse.json({ 
      message: 'Cleanup completed successfully',
      expiredSessions: expiredCount,
      details: {
        hardExpired: hardExpiredSessions?.length || 0,
        inactivityExpired: inactiveSessions?.length || 0
      }
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

  const MAX_CONCURRENT_SESSIONS = 10
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
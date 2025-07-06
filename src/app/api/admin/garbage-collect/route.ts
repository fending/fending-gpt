import { NextRequest, NextResponse } from 'next/server'
import { validateSession, extractSessionToken } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// Manual trigger for session garbage collection
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
    
    if (!authResult.success || !authResult.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    console.log('🗑️ Manual session garbage collection triggered')
    const supabase = await createClient()
    const now = new Date()
    const nowISO = now.toISOString()
    
    // 1. Expire sessions that exceeded hard time limit (expires_at < NOW)
    const { data: hardExpiredSessions, error: hardFetchError } = await supabase
      .from('chat_sessions')
      .select('id, status, expires_at')
      .lt('expires_at', nowISO)
      .in('status', ['active', 'queued', 'pending'])

    if (hardFetchError) {
      console.error('❌ Error fetching hard expired sessions:', hardFetchError)
      return NextResponse.json({ error: 'Failed to fetch expired sessions' }, { status: 500 })
    }

    let totalExpired = 0
    const results = {
      hardExpired: 0,
      inactivityExpired: 0,
      queueActivated: 0
    }

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
        console.error('❌ Error expiring hard limit sessions:', expireError)
        return NextResponse.json({ error: 'Failed to expire sessions' }, { status: 500 })
      }

      results.hardExpired = hardExpiredSessions.length
      totalExpired += hardExpiredSessions.length
      console.log(`  ⏰ Hard expired ${hardExpiredSessions.length} sessions (time limit exceeded)`)
    }

    // 2. Expire sessions inactive for more than 10 minutes
    const inactivityThreshold = new Date(now.getTime() - 10 * 60 * 1000) // 10 minutes ago
    const { data: inactiveSessions, error: inactiveFetchError } = await supabase
      .from('chat_sessions')
      .select('id, status, last_activity_at')
      .lt('last_activity_at', inactivityThreshold.toISOString())
      .eq('status', 'active')

    if (inactiveFetchError) {
      console.error('❌ Error fetching inactive sessions:', inactiveFetchError)
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
        console.error('❌ Error expiring inactive sessions:', inactiveExpireError)
      } else {
        results.inactivityExpired = inactiveSessions.length
        totalExpired += inactiveSessions.length
        console.log(`  💤 Expired ${inactiveSessions.length} sessions due to inactivity`)
      }
    }

    // 3. Trigger queue management after cleanup (activate waiting sessions)
    if (totalExpired > 0) {
      const activatedCount = await triggerQueueManagement(supabase)
      results.queueActivated = activatedCount
    }
    
    console.log(`✅ Manual garbage collection completed: ${totalExpired} sessions expired, ${results.queueActivated} activated`)

    return NextResponse.json({
      message: 'Garbage collection completed successfully',
      totalExpired,
      results,
      timestamp: nowISO
    })

  } catch (error) {
    console.error('❌ Error in manual garbage collection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function triggerQueueManagement(supabase: Awaited<ReturnType<typeof createClient>>): Promise<number> {
  try {
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
        console.error('❌ Error fetching queued sessions:', fetchError)
        return 0
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

        console.log(`  🎯 Activated ${queuedSessions.length} sessions from queue`)

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

        return queuedSessions.length
      }
    }

    return 0
  } catch (error) {
    console.error('❌ Error in queue management:', error)
    return 0
  }
}
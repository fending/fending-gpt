import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Recalculate queue positions for all queued sessions
    const { data: queuedSessions, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('id, token, queue_position')
      .eq('status', 'queued')
      .order('queue_position', { ascending: true })

    if (fetchError) {
      console.error('Error fetching queued sessions:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    if (!queuedSessions || queuedSessions.length === 0) {
      return NextResponse.json({ message: 'No queued sessions to update' })
    }

    // Update queue positions sequentially
    const updates = queuedSessions.map((session, index) => ({
      id: session.id,
      queue_position: index + 1
    }))

    for (const update of updates) {
      await supabase
        .from('chat_sessions')
        .update({ queue_position: update.queue_position })
        .eq('id', update.id)
    }

    // Check if we can activate any sessions (if there are < 5 active sessions)
    const { count: activeSessions } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const MAX_CONCURRENT_SESSIONS = 5
    const slotsAvailable = MAX_CONCURRENT_SESSIONS - (activeSessions || 0)

    if (slotsAvailable > 0 && queuedSessions.length > 0) {
      // Activate the first sessions in queue
      const sessionsToActivate = queuedSessions.slice(0, slotsAvailable)
      
      for (const session of sessionsToActivate) {
        await supabase
          .from('chat_sessions')
          .update({ 
            status: 'active',
            queue_position: null,
            activated_at: new Date().toISOString()
          })
          .eq('id', session.id)
      }

      console.log(`Activated ${sessionsToActivate.length} sessions from queue`)
    }

    return NextResponse.json({ 
      message: 'Queue updated successfully',
      updatedSessions: updates.length,
      activatedSessions: slotsAvailable > 0 ? Math.min(slotsAvailable, queuedSessions.length) : 0
    })

  } catch (error) {
    console.error('Error updating queue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to trigger queue updates (can be called from other APIs)
export async function triggerQueueUpdate() {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/session/queue-update`, {
      method: 'POST'
    })
    return response.ok
  } catch (error) {
    console.error('Error triggering queue update:', error)
    return false
  }
}
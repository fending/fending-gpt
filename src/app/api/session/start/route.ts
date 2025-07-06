import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateSession, extractSessionToken } from '@/lib/auth/middleware'
import crypto from 'crypto'

const MAX_CONCURRENT_SESSIONS = 50
const MAX_QUEUE_SIZE = 20
const SESSION_DURATION_MINUTES = 45

// Helper function for queue updates
async function triggerQueueUpdateHelper() {
  const supabase = await createClient()
  
  // Recalculate queue positions for remaining queued sessions
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

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    const supabase = await createClient()

    // Generate a secure session token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MINUTES * 60 * 1000)

    // Get current active sessions count
    const { count: activeSessions } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (!activeSessions || activeSessions < MAX_CONCURRENT_SESSIONS) {
      // Create active session immediately
      const { data: session, error } = await supabase
        .from('chat_sessions')
        .insert({
          email: email || null,
          token,
          status: 'active',
          expires_at: expiresAt.toISOString(),
          activated_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
          user_agent: request.headers.get('user-agent') || undefined,
          referrer: request.headers.get('referer') || undefined,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating session:', error)
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        status: 'active',
        token,
        sessionId: session.id,
        expiresAt: expiresAt.toISOString(),
      })
    }

    // Check queue size
    const { count: queuedSessions } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (!queuedSessions || queuedSessions >= MAX_QUEUE_SIZE) {
      return NextResponse.json(
        { error: 'Chat is currently at capacity. Please try again later.' },
        { status: 503 }
      )
    }

    // Add to queue
    const queuePosition = (queuedSessions || 0) + 1
    const estimatedWaitMinutes = queuePosition * 15 // Estimate 15 min per person

    const { data: queuedSession, error: queueError } = await supabase
      .from('chat_sessions')
      .insert({
        email: email || null,
        token,
        status: 'pending',
        queue_position: queuePosition,
        expires_at: expiresAt.toISOString(),
        user_agent: request.headers.get('user-agent') || undefined,
        referrer: request.headers.get('referer') || undefined,
      })
      .select()
      .single()

    if (queueError) {
      console.error('Error creating queued session:', queueError)
      return NextResponse.json(
        { error: 'Failed to join queue' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'queued',
      token,
      sessionId: queuedSession.id,
      queuePosition,
      estimatedWait: `${estimatedWaitMinutes} minutes`,
      expiresAt: expiresAt.toISOString(),
    })

  } catch (error) {
    console.error('Error in session start API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get session status
export async function GET(request: NextRequest) {
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

    const { session, isAdmin } = authResult

    // If session is pending, activate it (when user clicks email link)
    if (session!.status === 'pending') {
      const supabase = await createClient()
      const { error: updateError } = await supabase
        .from('chat_sessions')
        .update({ 
          status: 'active',
          activated_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString()
        })
        .eq('id', session!.id)

      if (updateError) {
        console.error('Error activating session:', updateError)
        return NextResponse.json(
          { error: 'Failed to activate session' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        status: 'active',
        sessionId: session!.id,
        expiresAt: session!.expires_at,
        isAdmin,
      })
    }

    // If session is queued, check if it can be activated
    if (session!.status === 'queued') {
      const supabase = await createClient()
      
      // Get full session details including queue_position
      const { data: fullSession, error: fullSessionError } = await supabase
        .from('chat_sessions')
        .select('id, status, queue_position, expires_at')
        .eq('id', session!.id)
        .single()

      if (fullSessionError || !fullSession) {
        return NextResponse.json(
          { error: 'Session details not found' },
          { status: 404 }
        )
      }
      
      // Check if there are available slots
      const { count: activeSessions } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      const MAX_CONCURRENT_SESSIONS = 50
      if ((activeSessions || 0) < MAX_CONCURRENT_SESSIONS) {
        // Activate this queued session
        const { error: updateError } = await supabase
          .from('chat_sessions')
          .update({ 
            status: 'active',
            queue_position: null,
            activated_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString()
          })
          .eq('id', session!.id)

        if (updateError) {
          console.error('Error activating queued session:', updateError)
        } else {
          // Trigger queue update for remaining sessions
          try {
            await triggerQueueUpdateHelper()
          } catch (error) {
            console.error('Error updating queue:', error)
          }

          return NextResponse.json({
            status: 'active',
            sessionId: session!.id,
            expiresAt: session!.expires_at,
            isAdmin,
          })
        }
      }

      // Still queued - return queue status
      return NextResponse.json({
        status: 'queued',
        sessionId: session!.id,
        queuePosition: fullSession.queue_position,
        expiresAt: session!.expires_at,
        isAdmin,
      })
    }

    return NextResponse.json({
      status: session!.status,
      sessionId: session!.id,
      expiresAt: session!.expires_at,
      isAdmin,
    })

  } catch (error) {
    console.error('Error in session status API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionToken = searchParams.get('token')

    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get the session
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('token', sessionToken)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // If session is active, return active status
    if (session.status === 'active') {
      return NextResponse.json({
        status: 'active',
        sessionId: session.id,
        expiresAt: session.expires_at
      })
    }

    // If session is not queued, return its status
    if (session.status !== 'queued') {
      return NextResponse.json({
        status: session.status,
        sessionId: session.id
      })
    }

    // For queued sessions, calculate current position and wait time
    const { count: activeSessions } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: aheadInQueue } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued')
      .lt('queue_position', session.queue_position)

    const currentPosition = (aheadInQueue || 0) + 1

    // Calculate realistic estimated wait
    const { data: activeSessionsData } = await supabase
      .from('chat_sessions')
      .select('created_at, expires_at')
      .eq('status', 'active')
      .order('expires_at', { ascending: true })

    let estimatedWaitMinutes = 5 // Minimum wait
    
    if (activeSessionsData && activeSessionsData.length > 0) {
      const now = new Date()
      const earliestExpiry = new Date(activeSessionsData[0].expires_at)
      const timeUntilSlot = Math.max(0, earliestExpiry.getTime() - now.getTime())
      
      // Calculate wait time: time until first slot + (queue position - 1) * average session duration
      const averageSessionMinutes = 25 // Conservative estimate
      estimatedWaitMinutes = Math.ceil(timeUntilSlot / (1000 * 60)) + ((currentPosition - 1) * averageSessionMinutes)
      
      // Cap at reasonable maximum
      estimatedWaitMinutes = Math.min(estimatedWaitMinutes, 120)
    } else {
      // No active sessions, should be activated soon
      estimatedWaitMinutes = Math.max(1, currentPosition * 2)
    }

    // Update the session's queue position if it changed
    if (currentPosition !== session.queue_position) {
      await supabase
        .from('chat_sessions')
        .update({ queue_position: currentPosition })
        .eq('id', session.id)
    }

    // Check if this session can be activated now
    const MAX_CONCURRENT_SESSIONS = 100
    const slotsAvailable = MAX_CONCURRENT_SESSIONS - (activeSessions || 0)

    if (slotsAvailable > 0 && currentPosition <= slotsAvailable) {
      // Activate this session
      await supabase
        .from('chat_sessions')
        .update({ 
          status: 'active',
          queue_position: null,
          activated_at: new Date().toISOString()
        })
        .eq('id', session.id)

      console.log(`Auto-activated session ${session.id} from queue`)

      return NextResponse.json({
        status: 'active',
        sessionId: session.id,
        expiresAt: session.expires_at,
        wasActivated: true
      })
    }

    return NextResponse.json({
      status: 'queued',
      sessionId: session.id,
      queuePosition: currentPosition,
      estimatedWaitMinutes,
      activeSessions: activeSessions || 0,
      maxSessions: MAX_CONCURRENT_SESSIONS
    })

  } catch (error) {
    console.error('Error checking queue status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
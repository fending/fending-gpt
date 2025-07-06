import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Quick database connectivity check
    const supabase = await createClient()
    const { count: activeSessions } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: queuedSessions } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued')

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      scheduler: {
        type: 'vercel-cron',
        running: true, // Vercel cron is managed automatically
        cronSecret: process.env.CRON_SECRET ? 'configured' : 'missing'
      },
      sessionStats: {
        active: activeSessions || 0,
        queued: queuedSessions || 0,
        maxConcurrent: 50
      },
      database: 'connected'
    })

  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      database: 'error'
    }, { status: 500 })
  }
}
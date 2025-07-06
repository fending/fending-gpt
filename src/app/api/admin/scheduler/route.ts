import { NextRequest, NextResponse } from 'next/server'
import { validateSession, extractSessionToken } from '@/lib/auth/middleware'
import { backgroundScheduler } from '@/lib/background/scheduler'

// GET - Get scheduler status
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
    
    if (!authResult.success || !authResult.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const status = backgroundScheduler.getStatus()
    
    return NextResponse.json({
      scheduler: status,
      message: `Background scheduler is ${status.isRunning ? 'running' : 'stopped'}`,
      environment: process.env.NODE_ENV,
      autoStart: process.env.NODE_ENV === 'production'
    })

  } catch (error) {
    console.error('Error getting scheduler status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Control scheduler (start/stop)
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

    const { action } = await request.json()

    if (!action || !['start', 'stop'].includes(action)) {
      return NextResponse.json(
        { error: 'Valid action required: "start" or "stop"' },
        { status: 400 }
      )
    }

    if (action === 'start') {
      backgroundScheduler.start()
      return NextResponse.json({
        message: 'Background scheduler started',
        status: backgroundScheduler.getStatus()
      })
    } else {
      backgroundScheduler.stop()
      return NextResponse.json({
        message: 'Background scheduler stopped',
        status: backgroundScheduler.getStatus()
      })
    }

  } catch (error) {
    console.error('Error controlling scheduler:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
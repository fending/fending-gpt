import { NextRequest, NextResponse } from 'next/server'
import { validateSession, extractSessionToken } from '@/lib/auth/middleware'

// GET - Get Vercel cron scheduler status
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

    return NextResponse.json({
      scheduler: {
        type: 'vercel-cron',
        isRunning: true, // Vercel cron is always running when deployed
        cronJobs: [
          {
            path: '/api/cron/garbage-collect',
            schedule: '1 5 * * *', // Daily at 12:01 AM ET (5:01 AM UTC)
            description: 'Session garbage collection and queue management'
          }
        ]
      },
      message: 'Vercel cron scheduler is managed automatically',
      environment: process.env.NODE_ENV,
      cronSecret: process.env.CRON_SECRET ? 'configured' : 'missing'
    })

  } catch (error) {
    console.error('Error getting scheduler status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Vercel cron cannot be controlled via API (returns info only)
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

    return NextResponse.json({
      message: 'Vercel cron jobs cannot be controlled via API. They are managed automatically by Vercel.',
      info: 'Cron jobs are configured in vercel.json and run automatically when deployed.',
      manualTrigger: {
        endpoint: '/api/cron/garbage-collect',
        method: 'GET',
        requiresAuth: 'Bearer token with CRON_SECRET'
      }
    })

  } catch (error) {
    console.error('Error in scheduler POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { BackgroundScheduler } from '@/lib/background/scheduler'

// Vercel Cron Job for session garbage collection
// Runs every minute as configured in vercel.json
export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron request from Vercel
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('🗑️ Vercel cron: Starting session garbage collection...')
    
    // Use the refactored scheduler
    await BackgroundScheduler.runSessionGarbageCollection()
    
    return NextResponse.json({
      success: true,
      message: 'Garbage collection completed',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in cron garbage collection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
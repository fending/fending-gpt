import { NextRequest, NextResponse } from 'next/server'
import { syncRSSToKnowledgeBase } from '@/lib/rss/sync'

// Vercel Cron Job for RSS article sync to RAG knowledge base
// Runs daily — checks brianfending.com/articles/feed.xml for new articles
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('RSS sync: Starting article sync...')

    const result = await syncRSSToKnowledgeBase()

    console.log(
      `RSS sync complete: ${result.fetched} in feed, ${result.existing} existing, ${result.inserted} inserted, ${result.failed} failed`
    )

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('RSS sync failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, extractSessionToken } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    // Verify admin access with optimized middleware
    const sessionToken = extractSessionToken(request)
    const authResult = await requireAdmin(sessionToken!)
    
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 500 })
    }

    // Use service role for admin operations (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get total stats from session-based tables
    const [
      { count: totalSessions },
      { count: totalMessages },
      { data: sessionData }
    ] = await Promise.all([
      supabase.from('chat_sessions').select('*', { count: 'exact', head: true }),
      supabase.from('chat_messages').select('*', { count: 'exact', head: true }),
      supabase.from('chat_sessions').select('total_cost_usd, total_tokens_used, email').neq('total_cost_usd', 0)
    ])

    const totalTokensUsed = sessionData?.reduce((sum, session) => sum + (session.total_tokens_used || 0), 0) || 0
    const totalCostUSD = sessionData?.reduce((sum, session) => sum + (session.total_cost_usd || 0), 0) || 0
    const uniqueEmails = new Set(sessionData?.filter(s => s.email).map(s => s.email)).size

    // Get daily stats for the last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: dailyMessages } = await supabase
      .from('chat_messages')
      .select('created_at, tokens_used, cost_usd, session_id')
      .gte('created_at', sevenDaysAgo.toISOString())

    // Process daily stats
    const dailyStatsMap = new Map<string, {
      date: string;
      sessions: Set<string>;
      messages: number;
      tokens: number;
      cost: number;
    }>()
    
    dailyMessages?.forEach(message => {
      const date = new Date(message.created_at).toLocaleDateString()
      if (!dailyStatsMap.has(date)) {
        dailyStatsMap.set(date, {
          date,
          sessions: new Set(),
          messages: 0,
          tokens: 0,
          cost: 0
        })
      }
      const dayStats = dailyStatsMap.get(date)!
      dayStats.sessions.add(message.session_id)
      dayStats.messages += 1
      dayStats.tokens += message.tokens_used || 0
      dayStats.cost += message.cost_usd || 0
    })

    const dailyStats = Array.from(dailyStatsMap.values()).map(day => ({
      ...day,
      sessions: day.sessions.size
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const stats = {
      totalUsers: uniqueEmails,
      totalConversations: totalSessions || 0,
      totalMessages: totalMessages || 0,
      totalTokensUsed,
      totalCostUSD,
      dailyStats
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
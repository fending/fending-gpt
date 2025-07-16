import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// Background job manager for Vercel cron-based scheduled tasks
class BackgroundScheduler {
  // Static methods for individual job execution (called from Vercel cron endpoints)

  static async runSessionGarbageCollection() {
    try {
      console.log('🗑️ Running session garbage collection...')
      const supabase = await createClient()
      const serviceSupabase = createServiceRoleClient()
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
        return
      }

      let totalExpired = 0

      if (hardExpiredSessions && hardExpiredSessions.length > 0) {
        // Mark hard expired sessions as expired - use service role for write
        const { error: expireError } = await serviceSupabase
          .from('chat_sessions')
          .update({ 
            status: 'expired',
            ended_at: nowISO
          })
          .lt('expires_at', nowISO)
          .in('status', ['active', 'queued', 'pending'])

        if (expireError) {
          console.error('❌ Error expiring hard limit sessions:', expireError)
          return
        }

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
        // Mark inactive sessions as expired - use service role for write
        const { error: inactiveExpireError } = await serviceSupabase
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
          totalExpired += inactiveSessions.length
          console.log(`  💤 Expired ${inactiveSessions.length} sessions due to inactivity`)
        }
      }

      // 3. Trigger queue management after cleanup (activate waiting sessions)
      if (totalExpired > 0) {
        await BackgroundScheduler.triggerQueueManagement()
      }
      
      if (totalExpired > 0) {
        console.log(`✅ Session garbage collection completed: ${totalExpired} sessions expired`)
      } else {
        console.log('✅ Session garbage collection completed: no sessions to expire')
      }

    } catch (error) {
      console.error('❌ Error in session garbage collection:', error)
    }
  }

  static async triggerQueueManagement() {
    try {
      const supabase = await createClient()
      const serviceSupabase = createServiceRoleClient()

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
          return
        }

        if (queuedSessions && queuedSessions.length > 0) {
          // Activate the first sessions in queue - use service role for write
          for (const session of queuedSessions) {
            await serviceSupabase
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
              await serviceSupabase
                .from('chat_sessions')
                .update({ queue_position: i + 1 })
                .eq('id', remainingQueued[i].id)
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in queue management:', error)
    }
  }

}

// Export the class for static method access
export { BackgroundScheduler }
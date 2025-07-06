import cron from 'node-cron'
import { createClient } from '@/lib/supabase/server'

// Background job manager for server-side scheduled tasks
class BackgroundScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map()
  private isRunning = false

  start() {
    if (this.isRunning) {
      console.log('⚠️ Background scheduler already running')
      return
    }

    console.log('🚀 Starting background scheduler...')
    this.isRunning = true

    // Session garbage collection - runs every 60 seconds
    const sessionCleanupJob = cron.schedule('*/1 * * * *', async () => {
      try {
        await this.runSessionGarbageCollection()
      } catch (error) {
        console.error('❌ Session garbage collection job failed:', error)
      }
    }, {
      scheduled: false, // Don't start immediately, we'll start it manually
      timezone: 'UTC' // Use UTC to avoid timezone issues
    })

    this.jobs.set('session-cleanup', sessionCleanupJob)
    sessionCleanupJob.start()

    console.log('✅ Background scheduler started with session cleanup job (every 60 seconds)')
  }

  stop() {
    if (!this.isRunning) {
      return
    }

    console.log('🛑 Stopping background scheduler...')
    
    this.jobs.forEach((job, name) => {
      job.stop()
      job.destroy()
      console.log(`  ❌ Stopped job: ${name}`)
    })
    
    this.jobs.clear()
    this.isRunning = false
    console.log('✅ Background scheduler stopped')
  }

  private async runSessionGarbageCollection() {
    try {
      console.log('🗑️ Running session garbage collection...')
      const supabase = await createClient()
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
        // Mark hard expired sessions as expired
        const { error: expireError } = await supabase
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
        // Mark inactive sessions as expired
        const { error: inactiveExpireError } = await supabase
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
        await this.triggerQueueManagement()
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

  private async triggerQueueManagement() {
    try {
      const supabase = await createClient()

      // Get current active sessions count
      const { count: activeSessions } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      const MAX_CONCURRENT_SESSIONS = 50
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
          // Activate the first sessions in queue
          for (const session of queuedSessions) {
            await supabase
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
              await supabase
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

  // Get status of running jobs
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobs: Array.from(this.jobs.keys()),
      jobCount: this.jobs.size
    }
  }
}

// Singleton instance
export const backgroundScheduler = new BackgroundScheduler()

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  // Start scheduler after a brief delay to ensure server is ready
  setTimeout(() => {
    backgroundScheduler.start()
  }, 5000) // 5 second delay
}
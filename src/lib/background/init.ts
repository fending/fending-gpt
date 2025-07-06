import { backgroundScheduler } from './scheduler'

// Initialize background jobs when the application starts
let initialized = false

export function initializeBackgroundJobs() {
  if (initialized) {
    console.log('⚠️ Background jobs already initialized')
    return
  }

  console.log('🔧 Initializing background jobs...')
  
  // Start the background scheduler
  try {
    backgroundScheduler.start()
    initialized = true
    console.log('✅ Background jobs initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize background jobs:', error)
  }
}

export function shutdownBackgroundJobs() {
  if (!initialized) {
    return
  }

  console.log('🔧 Shutting down background jobs...')
  
  try {
    backgroundScheduler.stop()
    initialized = false
    console.log('✅ Background jobs shut down successfully')
  } catch (error) {
    console.error('❌ Failed to shutdown background jobs:', error)
  }
}

// Auto-initialize in production environments
if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
  // Only run on server-side in production
  setTimeout(() => {
    initializeBackgroundJobs()
  }, 2000) // 2 second delay to ensure app is ready
}

// Handle graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', shutdownBackgroundJobs)
  process.on('SIGINT', shutdownBackgroundJobs)
  process.on('exit', shutdownBackgroundJobs)
}
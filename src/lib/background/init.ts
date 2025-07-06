// Background jobs now handled by Vercel cron
// This file is kept for backward compatibility but no longer initializes background jobs

export function initializeBackgroundJobs() {
  console.log('ℹ️ Background jobs now handled by Vercel cron (configured in vercel.json)')
}

export function shutdownBackgroundJobs() {
  console.log('ℹ️ Background jobs are managed by Vercel cron and cannot be shut down manually')
}
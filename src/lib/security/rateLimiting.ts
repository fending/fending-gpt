import { createClient } from '@supabase/supabase-js'

export interface RateLimitResult {
  allowed: boolean
  error?: string
  remainingRequests?: number
  resetTime?: Date
}

// Rate limit configurations
const RATE_LIMITS = {
  ip: {
    hourly: 20,   // Generous for IP-based limiting
    daily: 50
  },
  email: {
    hourly: 3,    // Strict for email-based limiting  
    daily: 10
  }
}

export async function checkRateLimit(
  identifier: string, 
  type: 'ip' | 'email'
): Promise<RateLimitResult> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date()
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get existing rate limit record
    const { data: existing, error: fetchError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('type', type)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Rate limit fetch error:', fetchError)
      // Allow request on database error (fail open)
      return { allowed: true }
    }

    // Check if currently blocked
    if (existing?.blocked_until && new Date(existing.blocked_until) > now) {
      return {
        allowed: false,
        error: 'Rate limit exceeded. Please try again later.',
        resetTime: new Date(existing.blocked_until)
      }
    }

    // Count recent requests for this identifier
    const { count: hourlyCount } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', identifier)
      .eq('type', type)
      .gte('window_start', hourAgo.toISOString())

    const { count: dailyCount } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', identifier)
      .eq('type', type)
      .gte('window_start', dayAgo.toISOString())

    const limits = RATE_LIMITS[type]
    const hourlyExceeded = (hourlyCount || 0) >= limits.hourly
    const dailyExceeded = (dailyCount || 0) >= limits.daily

    if (hourlyExceeded || dailyExceeded) {
      // Block for appropriate duration
      const blockDuration = hourlyExceeded ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 1 hour or 24 hours
      const blockedUntil = new Date(now.getTime() + blockDuration)

      // Update or insert rate limit record
      if (existing) {
        await supabase
          .from('rate_limits')
          .update({
            count: existing.count + 1,
            blocked_until: blockedUntil.toISOString(),
            last_attempt: now.toISOString()
          })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('rate_limits')
          .insert({
            identifier,
            type,
            count: 1,
            window_start: now.toISOString(),
            blocked_until: blockedUntil.toISOString(),
            last_attempt: now.toISOString()
          })
      }

      return {
        allowed: false,
        error: `Rate limit exceeded. Try again in ${hourlyExceeded ? '1 hour' : '24 hours'}.`,
        resetTime: blockedUntil
      }
    }

    // Update or insert rate limit record (allowed request)
    if (existing) {
      // Reset window if it's been more than a day
      const shouldResetWindow = new Date(existing.window_start) < dayAgo
      
      await supabase
        .from('rate_limits')
        .update({
          count: shouldResetWindow ? 1 : existing.count + 1,
          window_start: shouldResetWindow ? now.toISOString() : existing.window_start,
          blocked_until: null,
          last_attempt: now.toISOString()
        })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('rate_limits')
        .insert({
          identifier,
          type,
          count: 1,
          window_start: now.toISOString(),
          last_attempt: now.toISOString()
        })
    }

    return {
      allowed: true,
      remainingRequests: Math.max(0, limits.hourly - (hourlyCount || 0) - 1)
    }

  } catch (error) {
    console.error('Rate limiting error:', error)
    // Fail open - allow request if rate limiting system fails
    return { allowed: true }
  }
}

export async function checkEmailSuppression(email: string): Promise<{
  allowed: boolean
  reason?: string
  isWhitelisted?: boolean
}> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: suppression, error } = await supabase
      .from('suppressed_emails')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('Suppression check error:', error)
      return { allowed: true } // Fail open
    }

    if (!suppression) {
      return { allowed: true }
    }

    // Check if suppression has expired
    if (suppression.expires_at && new Date(suppression.expires_at) < new Date()) {
      // Mark as inactive
      await supabase
        .from('suppressed_emails')
        .update({ is_active: false })
        .eq('id', suppression.id)
      
      return { allowed: true }
    }

    if (suppression.type === 'whitelist') {
      return { allowed: true, isWhitelisted: true }
    }

    return {
      allowed: false,
      reason: suppression.reason || 'Email address is blocked'
    }

  } catch (error) {
    console.error('Email suppression check error:', error)
    return { allowed: true } // Fail open
  }
}

export async function checkDisposableEmail(email: string): Promise<{
  allowed: boolean
  reason?: string
}> {
  try {
    const domain = email.split('@')[1]?.toLowerCase()
    if (!domain) {
      return { allowed: false, reason: 'Invalid email format' }
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: disposableDomain } = await supabase
      .from('disposable_email_domains')
      .select('domain')
      .eq('domain', domain)
      .eq('is_active', true)
      .maybeSingle()

    if (disposableDomain) {
      return {
        allowed: false,
        reason: 'Disposable email addresses are not allowed'
      }
    }

    return { allowed: true }

  } catch (error) {
    console.error('Disposable email check error:', error)
    return { allowed: true } // Fail open
  }
}

// Utility to get client IP address
export function getClientIP(request: Request): string {
  // Check various headers for IP (for different hosting environments)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, use the first one
    return forwardedFor.split(',')[0].trim()
  }
  
  if (realIP) return realIP
  if (cfConnectingIP) return cfConnectingIP
  
  // Fallback (won't work in production behind proxies)
  return '127.0.0.1'
}
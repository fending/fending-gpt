import { createClient } from '@supabase/supabase-js'

export interface AuthResult {
  success: boolean
  session?: {
    id: string
    email: string | null
    status: string
    expires_at: string
    token: string
  }
  isAdmin: boolean
  error?: string
  status?: number
}

// Cache for request-duration auth results to avoid duplicate database calls
const authCache = new Map<string, { result: AuthResult; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function validateSession(sessionToken: string): Promise<AuthResult> {
  if (!sessionToken) {
    return {
      success: false,
      isAdmin: false,
      error: 'Session token required',
      status: 401
    }
  }

  // Check cache first
  const cached = authCache.get(sessionToken)
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.result
  }

  try {
    // Use service role for comprehensive access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get session first
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id, email, status, expires_at, token')
      .eq('token', sessionToken)
      .single()

    if (sessionError || !session) {
      const result: AuthResult = {
        success: false,
        isAdmin: false,
        error: 'Session not found',
        status: 404
      }
      authCache.set(sessionToken, { result, timestamp: Date.now() })
      return result
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      // Update session status to expired
      await supabase
        .from('chat_sessions')
        .update({ status: 'expired' })
        .eq('id', session.id)

      const result: AuthResult = {
        success: false,
        isAdmin: false,
        error: 'Session expired',
        status: 401
      }
      authCache.set(sessionToken, { result, timestamp: Date.now() })
      return result
    }

    // Check admin status separately if email exists
    let isAdmin = false
    if (session.email) {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('email')
        .eq('email', session.email)
        .single()
      
      isAdmin = !!adminUser
    }

    const result: AuthResult = {
      success: true,
      session: {
        id: session.id,
        email: session.email,
        status: session.status,
        expires_at: session.expires_at,
        token: session.token
      },
      isAdmin
    }

    // Cache the result
    authCache.set(sessionToken, { result, timestamp: Date.now() })
    return result

  } catch (error) {
    console.error('Error validating session:', error)
    const result: AuthResult = {
      success: false,
      isAdmin: false,
      error: 'Internal server error',
      status: 500
    }
    return result
  }
}

export async function requireAuth(sessionToken: string): Promise<AuthResult> {
  const authResult = await validateSession(sessionToken)
  
  if (!authResult.success) {
    return authResult
  }

  return authResult
}

export async function requireAdmin(sessionToken: string): Promise<AuthResult> {
  const authResult = await validateSession(sessionToken)
  
  if (!authResult.success) {
    return authResult
  }

  if (!authResult.isAdmin) {
    return {
      success: false,
      isAdmin: false,
      error: 'Admin access required',
      status: 403
    }
  }

  return authResult
}

// Utility to clear cache when needed (e.g., admin privileges changed)
export function clearAuthCache(sessionToken?: string) {
  if (sessionToken) {
    authCache.delete(sessionToken)
  } else {
    authCache.clear()
  }
}

// Utility to extract session token from request
export function extractSessionToken(request: Request): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '')
  }

  // Try query parameter
  const url = new URL(request.url)
  return url.searchParams.get('token')
}
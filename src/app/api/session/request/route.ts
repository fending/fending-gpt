import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, checkEmailSuppression, checkDisposableEmail, getClientIP } from '@/lib/security/rateLimiting'
import { verifyRecaptcha } from '@/lib/security/recaptcha'
import crypto from 'crypto'

const MAX_CONCURRENT_SESSIONS = 10
const SESSION_DURATION_MINUTES = 45

export async function POST(request: NextRequest) {
  try {
    const { email, recaptchaToken } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      )
    }

    // Get client IP for rate limiting
    const clientIP = getClientIP(request)

    // 1. Verify reCAPTCHA
    if (recaptchaToken) {
      const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'session_request')
      if (!recaptchaResult.success) {
        return NextResponse.json(
          { error: 'reCAPTCHA verification failed' },
          { status: 400 }
        )
      }
    }

    // 2. Check IP rate limiting (generous)
    const ipRateLimit = await checkRateLimit(clientIP, 'ip')
    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        { error: ipRateLimit.error },
        { status: 429 }
      )
    }

    // 3. Check email rate limiting (strict)
    const emailRateLimit = await checkRateLimit(email.toLowerCase(), 'email')
    if (!emailRateLimit.allowed) {
      return NextResponse.json(
        { error: emailRateLimit.error },
        { status: 429 }
      )
    }

    // 4. Check email suppression (blacklist/whitelist)
    const suppressionCheck = await checkEmailSuppression(email)
    if (!suppressionCheck.allowed) {
      return NextResponse.json(
        { error: suppressionCheck.reason || 'Email address is not allowed' },
        { status: 403 }
      )
    }

    // 5. Check for disposable email domains
    const disposableCheck = await checkDisposableEmail(email)
    if (!disposableCheck.allowed) {
      return NextResponse.json(
        { error: disposableCheck.reason },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Generate a secure session token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MINUTES * 60 * 1000)

    // Get current active sessions count
    const { count: activeSessions } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (!activeSessions || activeSessions < MAX_CONCURRENT_SESSIONS) {
      // Create active session
      const { error } = await supabase
        .from('chat_sessions')
        .insert({
          email,
          token,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
          user_agent: request.headers.get('user-agent') || undefined,
          referrer: request.headers.get('referer') || undefined,
        })

      if (error) {
        console.error('Error creating session:', error)
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: 500 }
        )
      }
    } else {
      // Get queue count and create queued session
      const { count: queuedSessions } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued')

      const queuePosition = (queuedSessions || 0) + 1
      
      // Calculate realistic estimated wait based on active session ages
      const { data: activeSessions } = await supabase
        .from('chat_sessions')
        .select('created_at, expires_at')
        .eq('status', 'active')
        .order('expires_at', { ascending: true })

      let estimatedWaitMinutes = 5 // Minimum wait
      
      if (activeSessions && activeSessions.length > 0) {
        // Find when the earliest active session will expire
        const now = new Date()
        const earliestExpiry = new Date(activeSessions[0].expires_at)
        const timeUntilSlot = Math.max(0, earliestExpiry.getTime() - now.getTime())
        
        // Calculate wait time: time until first slot + (queue position - 1) * average session duration
        const averageSessionMinutes = 25 // Conservative estimate
        estimatedWaitMinutes = Math.ceil(timeUntilSlot / (1000 * 60)) + ((queuePosition - 1) * averageSessionMinutes)
        
        // Cap at reasonable maximum
        estimatedWaitMinutes = Math.min(estimatedWaitMinutes, 120)
      } else {
        // Should not happen since we're in the queue branch, but fallback
        estimatedWaitMinutes = queuePosition * 10
      }

      const { error } = await supabase
        .from('chat_sessions')
        .insert({
          email,
          token,
          status: 'queued',
          queue_position: queuePosition,
          expires_at: expiresAt.toISOString(),
          user_agent: request.headers.get('user-agent') || undefined,
          referrer: request.headers.get('referer') || undefined,
        })

      if (error) {
        console.error('Error creating queued session:', error)
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        status: 'queued',
        queuePosition,
        estimatedWaitMinutes,
        sessionToken: token,
        message: 'You have been added to the queue',
        // For development/testing
        ...(process.env.NODE_ENV === 'development' && { 
          debugLink: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/chat?token=${token}`
        })
      })
    }

    // Send email with session link
    const chatLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/chat?token=${token}`
    
    try {
      await sendSessionEmail(email, chatLink, expiresAt)
    } catch (emailError) {
      console.error('Failed to send email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send email. Please try again or contact support.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Session link sent to email',
      // For development/testing, include the link
      ...(process.env.NODE_ENV === 'development' && { 
        debugLink: chatLink 
      })
    })

  } catch (error) {
    console.error('Error in session request API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function sendSessionEmail(email: string, chatLink: string, expiresAt: Date) {
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN
  
  if (!postmarkToken) {
    throw new Error('POSTMARK_SERVER_TOKEN environment variable is not set')
  }

  const emailData = {
    From: 'admin@brianfending.com',
    To: email,
    Subject: "Your chat session with Brian's AI Assistant",
    HtmlBody: `
      <h2>Your chat session is ready!</h2>
      <p>Click the link below to start chatting with Brian's AI assistant:</p>
      <p><a href="${chatLink}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Start Chat Session</a></p>
      <p><strong>Important:</strong> This link expires at ${expiresAt.toLocaleString()} for security.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
    TextBody: `Your chat session is ready!

Click this link to start chatting with Brian's AI assistant:
${chatLink}

Important: This link expires at ${expiresAt.toLocaleString()} for security.

If you didn't request this, please ignore this email.`
  }

  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': postmarkToken
    },
    body: JSON.stringify(emailData)
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('Postmark API error:', errorData)
    
    // Handle specific Postmark approval issue
    if (errorData.ErrorCode === 412) {
      console.warn('Postmark account pending approval - email domain restriction')
      // In development, just log the email instead of failing
      if (process.env.NODE_ENV === 'development') {
        console.log('DEV: Would send email to:', email)
        console.log('DEV: Email content:', emailData)
        return { MessageID: 'dev-mode-' + Date.now(), To: email, Message: 'Email logged in development mode' }
      }
    }
    
    throw new Error(`Failed to send email: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()
  console.log('Email sent successfully:', { MessageID: result.MessageID, To: result.To })
  
  return result
}
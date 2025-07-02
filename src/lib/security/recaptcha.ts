export interface RecaptchaResult {
  success: boolean
  score?: number
  error?: string
  action?: string
}

export async function verifyRecaptcha(
  token: string, 
  expectedAction: string = 'session_request'
): Promise<RecaptchaResult> {
  try {
    // Skip reCAPTCHA verification in development
    if (process.env.NODE_ENV === 'development' && token === 'dev-bypass-token') {
      console.log('DEV: Bypassing reCAPTCHA verification for localhost')
      return {
        success: true,
        score: 1.0,
        action: expectedAction
      }
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY
    
    if (!secretKey) {
      console.error('RECAPTCHA_SECRET_KEY not configured')
      return { success: true } // Fail open if not configured
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    })

    const data = await response.json()

    if (!data.success) {
      return {
        success: false,
        error: 'reCAPTCHA verification failed',
      }
    }

    // Check score (reCAPTCHA v3 returns score 0.0-1.0)
    const score = data.score || 0
    const minScore = 0.5 // Adjust based on your needs (0.5 is reasonable)

    if (score < minScore) {
      return {
        success: false,
        score,
        error: `Low reCAPTCHA score: ${score}`,
      }
    }

    // Check action if provided
    if (expectedAction && data.action !== expectedAction) {
      return {
        success: false,
        error: 'reCAPTCHA action mismatch',
        action: data.action,
      }
    }

    return {
      success: true,
      score,
      action: data.action,
    }

  } catch (error) {
    console.error('reCAPTCHA verification error:', error)
    return { success: true } // Fail open on network/server errors
  }
}

// Client-side reCAPTCHA execution helper
export function executeRecaptcha(action: string = 'session_request'): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.grecaptcha) {
      reject(new Error('reCAPTCHA not loaded'))
      return
    }

    window.grecaptcha.ready(() => {
      window.grecaptcha
        .execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!, { action })
        .then(resolve)
        .catch(reject)
    })
  })
}


// TypeScript declarations for window.grecaptcha
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}
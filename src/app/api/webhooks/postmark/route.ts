import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

interface PostmarkWebhookEvent {
  Type: string
  Email: string
  Bounce?: {
    Type: string
    Description: string
    Details: string
  }
  Complaint?: {
    ComplaintFeedbackType: string
    Details: string
  }
  MessageID: string
  Timestamp: string
  [key: string]: any
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook authenticity (if you configure webhook auth in Postmark)
    const body = await request.text()
    const signature = request.headers.get('x-postmark-signature')
    
    // Optional: Verify webhook signature if configured
    // if (signature && !verifyPostmarkSignature(body, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    const event: PostmarkWebhookEvent = JSON.parse(body)
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Store the webhook event
    const { error: insertError } = await supabase
      .from('email_events')
      .insert({
        email: event.Email.toLowerCase(),
        event_type: event.Type.toLowerCase(),
        event_data: event,
        bounce_type: event.Bounce?.Type,
        complaint_type: event.Complaint?.ComplaintFeedbackType,
        processed: false
      })

    if (insertError) {
      console.error('Error storing email event:', insertError)
    }

    // Process the event based on type
    await processEmailEvent(event, supabase)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Postmark webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function processEmailEvent(event: PostmarkWebhookEvent, supabase: any) {
  const email = event.Email.toLowerCase()

  switch (event.Type) {
    case 'Bounce':
      await handleBounce(email, event, supabase)
      break
      
    case 'SpamComplaint':
      await handleSpamComplaint(email, event, supabase)
      break
      
    case 'Delivery':
      // Optional: Log successful deliveries
      console.log(`Email delivered successfully to ${email}`)
      break
      
    default:
      console.log(`Unhandled Postmark event type: ${event.Type}`)
  }

  // Mark event as processed
  await supabase
    .from('email_events')
    .update({ processed: true })
    .eq('email', email)
    .eq('event_type', event.Type.toLowerCase())
    .eq('processed', false)
}

async function handleBounce(email: string, event: PostmarkWebhookEvent, supabase: any) {
  const bounceType = event.Bounce?.Type
  const description = event.Bounce?.Description || 'Email bounced'

  // Only suppress on hard bounces
  if (bounceType === 'HardBounce') {
    console.log(`Hard bounce detected for ${email}, adding to suppression list`)
    
    // Check if already suppressed
    const { data: existing } = await supabase
      .from('suppressed_emails')
      .select('id')
      .eq('email', email)
      .eq('type', 'blacklist')
      .eq('is_active', true)
      .maybeSingle()

    if (!existing) {
      await supabase
        .from('suppressed_emails')
        .insert({
          email,
          type: 'blacklist',
          reason: `Hard bounce: ${description}`,
          added_by: 'postmark_webhook'
        })
    }
  } else {
    console.log(`Soft bounce for ${email}: ${description}`)
    // Soft bounces are temporary, don't suppress but log for monitoring
  }
}

async function handleSpamComplaint(email: string, event: PostmarkWebhookEvent, supabase: any) {
  const complaintType = event.Complaint?.ComplaintFeedbackType || 'spam'
  
  console.log(`Spam complaint from ${email}, adding to suppression list`)
  
  // Check if already suppressed
  const { data: existing } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', email)
    .eq('type', 'blacklist')
    .eq('is_active', true)
    .maybeSingle()

  if (!existing) {
    await supabase
      .from('suppressed_emails')
      .insert({
        email,
        type: 'blacklist',
        reason: `Spam complaint: ${complaintType}`,
        added_by: 'postmark_webhook'
      })
  }
}

// Optional: Verify Postmark webhook signature
function verifyPostmarkSignature(body: string, signature: string): boolean {
  if (!process.env.POSTMARK_WEBHOOK_SECRET) {
    return true // Skip verification if secret not configured
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.POSTMARK_WEBHOOK_SECRET)
    .update(body)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )
}
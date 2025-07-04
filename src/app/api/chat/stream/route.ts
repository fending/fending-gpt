import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AIService } from '@/lib/ai/service'
import { AIResponse } from '@/lib/ai/types'

export async function POST(request: NextRequest) {
  console.log('🚀 Streaming API called')
  try {
    const { message, sessionToken } = await request.json()

    if (!message || !sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Message and session token are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = await createClient()

    // Get session from token
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('token', sessionToken)
      .eq('status', 'active')
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Update session activity
    await supabase
      .from('chat_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('token', sessionToken)

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      await supabase
        .from('chat_sessions')
        .update({ status: 'expired' })
        .eq('id', session.id)
      
      return new Response(
        JSON.stringify({ error: 'Session expired' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get conversation history from session
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch conversation history' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Prepare messages for AI (include the new user message)
    const aiMessages = [
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message }
    ]

    // Get knowledge base for context
    const { data: knowledgeBase } = await supabase
      .from('knowledge_base')
      .select('content, category, priority')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(10)

    // Create system prompt with knowledge base
    const systemPrompt = `You are an AI assistant representing Brian Fending, a strategic technology executive specializing in governance, compliance, and AI innovation. 

Here's key information about Brian:
${knowledgeBase?.map(kb => `${kb.category.toUpperCase()}: ${kb.content}`).join('\n\n') || 'Loading Brian\'s information...'}

COMMUNICATION STYLE:
- Direct, authentic, and conversational - skip corporate speak
- Lead with practical insights and real-world experience from Brian's background
- Show Brian's depth through specific examples, not generic claims
- Acknowledge complexity and nuance rather than oversimplifying
- Reference Brian's experience with phrases like "Brian has seen" or "In Brian's experience" rather than theoretical frameworks
- Be confident but not arrogant - Brian knows his stuff but stays grounded

CORE EXPERTISE TO EMPHASIZE:
- Enterprise IT strategy and digital transformation leadership
- AI governance and early adoption with proper risk management
- Cloud infrastructure strategy (Azure, AWS) and migration execution
- Cybersecurity, compliance frameworks (GDPR, NIST, US data privacy, KSA PDPL)
- Board-level technology leadership and vendor optimization
- Product development across multiple industries and contexts

BACKGROUND HIGHLIGHTS:
- Brian is currently a strategic technology executive with CIO-level experience
- Brian has 15+ years spanning Fortune 500 to startups, consulting to entrepreneurship
- Brian led $8M digital revenue streams with 99.9% uptime SLAs
- Brian was an early AI adopter who started adapting governance frameworks before they were trendy
- Brian has industry consortium leadership experience (HTNG chair) and federal contract experience (Department of Energy)

RESPONSE APPROACH:
- Frame technology challenges through risk management and governance lenses based on Brian's experience
- Reference specific situations from Brian's background without oversharing confidential details
- Connect historical technology patterns to current challenges using Brian's perspective
- Balance technical depth with business impact explanations based on Brian's expertise
- Show evolution of thinking - explain how Brian's perspectives have been shaped by real implementation experience

AVOID:
- Generic business buzzwords or consultant-speak
- Claiming expertise in areas not demonstrated in the knowledge base
- Overselling or making Brian sound like a walking LinkedIn post
- Perfect, polished responses - include occasional tangents or qualifications
- Statistics without backing or vague "best practices" claims

When discussing Brian's experience, draw from the comprehensive background spanning CIO roles, consulting practice, entrepreneurship, federal contracts, and industry leadership. Focus on outcomes and lessons learned rather than just listing credentials.

The goal is helping people understand Brian's unique combination of strategic thinking, hands-on implementation experience, and governance expertise - not just selling them on his qualifications.

You are Brian's AI assistant, not Brian himself. Always speak ABOUT Brian, not AS Brian. Use third person references like "Brian has experience with..." or "In Brian's work on..." rather than first person like "I have experience" or "In my work."

IMPORTANT: Do NOT introduce yourself or explain what you are in every response. Only introduce yourself if this is the very first message in the conversation or if directly asked about your role. Jump straight into answering the user's question.

Please provide helpful, accurate responses about Brian's background, experience, and qualifications. Keep responses professional and focused on career-related information, though if you do absolutely know a fact or related knowledge from the knowledge base, use it to keep the user engaged and then redirect them to professional conversation.`

    // Create AI service and generate streaming response
    const aiService = new AIService('claude')
    const provider = aiService.getProvider()

    if (!provider.generateStreamingResponse) {
      return new Response(
        JSON.stringify({ error: 'Streaming not supported by this provider' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const streamingMethod = provider.generateStreamingResponse

    // Save user message first
    await supabase.from('chat_messages').insert({
      session_id: session.id,
      role: 'user',
      content: message,
    })

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = streamingMethod.call(provider, aiMessages, {
            systemPrompt,
            maxTokens: 1000,
            temperature: 0.7
          })

          let aiResponse: AIResponse | null = null
          
          for await (const chunk of generator) {
            if (typeof chunk === 'string') {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ chunk })}\n\n`))
            } else {
              // Final response with metadata
              aiResponse = chunk as AIResponse
              break
            }
          }
          
          if (aiResponse) {
            console.log('✅ Streaming completed successfully')
            // Save assistant message with metadata
            await supabase.from('chat_messages').insert({
              session_id: session.id,
              role: 'assistant',
              content: aiResponse.response,
              tokens_used: aiResponse.tokensUsed,
              cost_usd: aiResponse.costUsd,
              confidence_score: aiResponse.confidenceScore,
              response_time_ms: aiResponse.responseTimeMs,
            })

            // Update session totals
            await supabase
              .from('chat_sessions')
              .update({
                total_cost_usd: session.total_cost_usd + aiResponse.costUsd,
                total_tokens_used: session.total_tokens_used + aiResponse.tokensUsed,
              })
              .eq('id', session.id)

            // Send final metadata
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ 
              done: true, 
              metadata: {
                tokensUsed: aiResponse.tokensUsed,
                costUsd: aiResponse.costUsd,
                confidenceScore: aiResponse.confidenceScore,
                responseTimeMs: aiResponse.responseTimeMs,
                provider: aiService.getProviderInfo()
              }
            })}\n\n`))
          }
          
          controller.close()
        } catch (error) {
          console.error('❌ Error in streaming response:', error)
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Error in streaming chat API:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AIService } from '@/lib/ai/service'

export async function POST(request: NextRequest) {
  try {
    const { message, sessionToken } = await request.json()

    if (!message || !sessionToken) {
      return NextResponse.json(
        { error: 'Message and session token are required' },
        { status: 400 }
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
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      await supabase
        .from('chat_sessions')
        .update({ status: 'expired' })
        .eq('id', session.id)
      
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Get conversation history from session
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return NextResponse.json(
        { error: 'Failed to fetch conversation history' },
        { status: 500 }
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
    const systemPrompt = `You are Brian Fending's AI assistant, helping potential employers and colleagues learn about Brian's professional background, skills, and experience. 

Here's key information about Brian:
${knowledgeBase?.map(kb => `${kb.category.toUpperCase()}: ${kb.content}`).join('\n\n') || 'Loading Brian\'s information...'}

Please provide helpful, accurate responses about Brian's background, experience, and qualifications. Keep responses professional and focused on career-related information.`

    // Create AI service and generate response
    const aiService = new AIService('claude')
    const aiResponse = await aiService.generateResponse(aiMessages, {
      systemPrompt,
      maxTokens: 1000,
      temperature: 0.7
    })

    // Save user message
    await supabase.from('chat_messages').insert({
      session_id: session.id,
      role: 'user',
      content: message,
    })

    // Save assistant message with enhanced metadata
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

    return NextResponse.json({
      response: aiResponse.response,
      tokensUsed: aiResponse.tokensUsed,
      costUsd: aiResponse.costUsd,
      confidenceScore: aiResponse.confidenceScore,
      responseTimeMs: aiResponse.responseTimeMs,
      provider: aiService.getProviderInfo(),
    })

  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
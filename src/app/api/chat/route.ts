// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { AIService } from '@/lib/ai/service'
import { RAGService } from '@/lib/rag/service'
import { getSystemPrompt } from '@/lib/config/system-prompt'

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

    // Use service role client for database operations
    const serviceSupabase = createServiceRoleClient()
    
    // Update session activity
    await serviceSupabase
      .from('chat_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('token', sessionToken)

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      await serviceSupabase
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
    // Limit conversation history to last 20 messages to prevent context overflow
    const recentMessages = messages.slice(-20)
    const aiMessages = [
      ...recentMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message }
    ]

    console.log(`🔍 Chat context: ${aiMessages.length} messages, latest: "${message.slice(0, 50)}..."`)
    console.log(`📚 RAG query: "${message.slice(0, 50)}..."`)
    

    // Get relevant knowledge using RAG with error handling
    let ragResult
    let ragService
    
    try {
      ragService = new RAGService()
      ragResult = await ragService.queryKnowledge(message, {
        maxResults: 15,
        similarityThreshold: 0.6, // Lower threshold for better recall
        ensureCategoryDiversity: true
      })
      console.log(`✅ RAG query successful, found ${ragResult.entries.length} entries`)
    } catch (ragError) {
      console.error('❌ RAG service failed, using fallback context:', ragError)
      // Create fallback empty result
      ragResult = { entries: [], totalRetrieved: 0, query: message }
      ragService = new RAGService() // Still need service for buildContext
    }

    // Load system prompt from database with RAG context
    const systemPrompt = await getSystemPrompt(ragService.buildContext(ragResult))

    // Create AI service and generate response
    const aiService = new AIService('claude')
    const aiResponse = await aiService.generateResponse(aiMessages, {
      systemPrompt,
      maxTokens: 1000,
      temperature: 0.7
    })

    // serviceSupabase already created above for session operations
    
    // Save user message
    const { error: userMessageError } = await serviceSupabase.from('chat_messages').insert({
      session_id: session.id,
      role: 'user',
      content: message,
    })
    
    if (userMessageError) {
      console.error('❌ Failed to save user message:', userMessageError)
      return NextResponse.json(
        { error: 'Failed to save user message' },
        { status: 500 }
      )
    }

    // Save assistant message with enhanced metadata
    const { error: assistantMessageError } = await serviceSupabase.from('chat_messages').insert({
      session_id: session.id,
      role: 'assistant',
      content: aiResponse.response,
      tokens_used: aiResponse.tokensUsed,
      cost_usd: aiResponse.costUsd,
      confidence_score: aiResponse.confidenceScore,
      response_time_ms: aiResponse.responseTimeMs,
    })
    
    if (assistantMessageError) {
      console.error('❌ Failed to save assistant message:', assistantMessageError)
      return NextResponse.json(
        { error: 'Failed to save assistant message' },
        { status: 500 }
      )
    }

    // Update session totals - use service role client
    const { error: sessionUpdateError } = await serviceSupabase
      .from('chat_sessions')
      .update({
        total_cost_usd: session.total_cost_usd + aiResponse.costUsd,
        total_tokens_used: session.total_tokens_used + aiResponse.tokensUsed,
      })
      .eq('id', session.id)
      
    if (sessionUpdateError) {
      console.error('❌ Failed to update session totals:', sessionUpdateError)
      // Continue anyway, messages were saved
    }

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
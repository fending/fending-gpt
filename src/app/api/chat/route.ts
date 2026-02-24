import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getAnthropicModel, calculateCost, calculateConfidence } from '@/lib/ai/models'
import type { ModelType } from '@/lib/ai/models'
import { analyzeQueryComplexity } from '@/lib/ai/query-analyzer'
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

    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('token', sessionToken)
      .eq('status', 'active')
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()

    await serviceSupabase
      .from('chat_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('token', sessionToken)

    if (new Date(session.expires_at) < new Date()) {
      await serviceSupabase
        .from('chat_sessions')
        .update({ status: 'expired' })
        .eq('id', session.id)
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

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

    const recentMessages = messages.slice(-20)
    const aiMessages = [
      ...recentMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message },
    ]

    // RAG + system prompt
    let ragResult
    let ragService

    try {
      ragService = new RAGService()
      ragResult = await ragService.queryKnowledge(message, {
        maxResults: 15,
        similarityThreshold: 0.6,
        ensureCategoryDiversity: true,
      })
    } catch (ragError) {
      console.error('RAG service failed, using fallback context:', ragError)
      ragResult = { entries: [], totalRetrieved: 0, query: message }
      ragService = new RAGService()
    }

    const systemPrompt = await getSystemPrompt(ragService.buildContext(ragResult))

    // Smart model selection
    const analysis = analyzeQueryComplexity(message)
    const modelType: ModelType = analysis.recommendedModel
    const model = getAnthropicModel(modelType)

    const startTime = Date.now()

    const { text, usage } = await generateText({
      model,
      system: systemPrompt,
      messages: aiMessages,
      maxOutputTokens: 1000,
      temperature: 0.7,
    })

    const responseTimeMs = Date.now() - startTime
    const inputTokens = usage.inputTokens ?? 0
    const outputTokens = usage.outputTokens ?? 0
    const tokensUsed = inputTokens + outputTokens
    const costUsd = calculateCost(inputTokens, outputTokens, modelType)
    const confidenceScore = calculateConfidence(text, responseTimeMs)

    // Save user message
    const { error: userMessageError } = await serviceSupabase
      .from('chat_messages')
      .insert({ session_id: session.id, role: 'user', content: message })

    if (userMessageError) {
      console.error('Failed to save user message:', userMessageError)
      return NextResponse.json({ error: 'Failed to save user message' }, { status: 500 })
    }

    // Save assistant message
    const { error: assistantMessageError } = await serviceSupabase
      .from('chat_messages')
      .insert({
        session_id: session.id,
        role: 'assistant',
        content: text,
        tokens_used: tokensUsed,
        cost_usd: costUsd,
        confidence_score: confidenceScore,
        response_time_ms: responseTimeMs,
      })

    if (assistantMessageError) {
      console.error('Failed to save assistant message:', assistantMessageError)
      return NextResponse.json({ error: 'Failed to save assistant message' }, { status: 500 })
    }

    // Update session totals
    await serviceSupabase
      .from('chat_sessions')
      .update({
        total_cost_usd: session.total_cost_usd + costUsd,
        total_tokens_used: session.total_tokens_used + tokensUsed,
      })
      .eq('id', session.id)

    return NextResponse.json({
      response: text,
      tokensUsed,
      costUsd,
      confidenceScore,
      responseTimeMs,
    })
  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

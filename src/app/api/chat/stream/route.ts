import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getAnthropicModel, calculateCost, calculateConfidence, MODEL_CONFIGS } from '@/lib/ai/models'
import type { ModelType } from '@/lib/ai/models'
import { analyzeQueryComplexity } from '@/lib/ai/query-analyzer'
import { RAGService } from '@/lib/rag/service'
import { getSystemPrompt } from '@/lib/config/system-prompt'

export async function POST(request: NextRequest) {
  try {
    const { message, sessionToken } = await request.json()

    if (!message || !sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Message and session token are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
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

      return new Response(
        JSON.stringify({ error: 'Session expired' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

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

    // Collect RAG entry IDs for storage with assistant message
    const ragEntryIds = ragResult.entries
      .map((entry: { id?: string }) => entry.id)
      .filter((id): id is string => !!id)

    const systemPrompt = await getSystemPrompt(ragService.buildContext(ragResult))

    // Smart model selection
    const analysis = analyzeQueryComplexity(message)
    const modelType: ModelType = analysis.recommendedModel
    const model = getAnthropicModel(modelType)

    console.log(`Query complexity: ${analysis.complexity}, model: ${modelType}`)

    // Save user message
    const { error: userMessageError } = await serviceSupabase
      .from('chat_messages')
      .insert({ session_id: session.id, role: 'user', content: message })

    if (userMessageError) {
      console.error('Failed to save user message:', userMessageError)
      return new Response(
        JSON.stringify({ error: 'Failed to save user message' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const startTime = Date.now()

    const stream = new ReadableStream({
      async start(controller) {
        const encode = (obj: unknown) =>
          new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`)

        try {
          const result = streamText({
            model,
            system: systemPrompt,
            messages: aiMessages,
            maxOutputTokens: 1000,
            temperature: 0.7,
          })

          let fullText = ''

          for await (const part of result.fullStream) {
            if (part.type === 'text-delta') {
              fullText += part.text
              controller.enqueue(encode({ chunk: part.text }))
            } else if (part.type === 'error') {
              console.error('Stream error part:', part.error)
              controller.enqueue(encode({ error: 'Stream error' }))
              controller.close()
              return
            }
          }

          const usage = await result.usage
          const responseTimeMs = Date.now() - startTime
          const inputTokens = usage.inputTokens ?? 0
          const outputTokens = usage.outputTokens ?? 0
          const tokensUsed = inputTokens + outputTokens
          const costUsd = calculateCost(inputTokens, outputTokens, modelType)
          const confidenceScore = calculateConfidence(fullText, responseTimeMs)

          // Save assistant message
          const { error: assistantMessageError } = await serviceSupabase
            .from('chat_messages')
            .insert({
              session_id: session.id,
              role: 'assistant',
              content: fullText,
              tokens_used: tokensUsed,
              cost_usd: costUsd,
              confidence_score: confidenceScore,
              response_time_ms: responseTimeMs,
              rag_entry_ids: ragEntryIds.length > 0 ? ragEntryIds : null,
            })

          if (assistantMessageError) {
            console.error('Failed to save assistant message:', assistantMessageError)
            controller.enqueue(encode({ error: 'Failed to save assistant message' }))
            controller.close()
            return
          }

          // Update session totals
          await serviceSupabase
            .from('chat_sessions')
            .update({
              total_cost_usd: session.total_cost_usd + costUsd,
              total_tokens_used: session.total_tokens_used + tokensUsed,
            })
            .eq('id', session.id)

          controller.enqueue(
            encode({
              done: true,
              metadata: {
                tokensUsed,
                costUsd,
                confidenceScore,
                responseTimeMs,
                modelId: MODEL_CONFIGS[modelType].modelId,
                modelType,
              },
            })
          )

          controller.close()
        } catch (error) {
          console.error('Error in streaming response:', error)
          controller.enqueue(encode({ error: 'Stream error' }))
          controller.close()
        }
      },
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

import { NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { AIService } from '@/lib/ai/service'
import { AIResponse } from '@/lib/ai/types'
import { RAGService } from '@/lib/rag/service'
import { getSystemPrompt } from '@/lib/config/system-prompt'

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
    // Limit conversation history to last 20 messages to prevent context overflow
    const recentMessages = messages.slice(-20)
    const aiMessages = [
      ...recentMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message }
    ]

    console.log(`🔍 Streaming context: ${aiMessages.length} messages, latest: "${message.slice(0, 50)}..."`)
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

    // Create AI service and generate streaming response with smart model selection
    const aiService = new AIService('claude')

    // Save user message first - serviceSupabase already created above
    const { error: userMessageError } = await serviceSupabase.from('chat_messages').insert({
      session_id: session.id,
      role: 'user',
      content: message,
    })
    
    if (userMessageError) {
      console.error('❌ Failed to save user message:', userMessageError)
      return new Response(
        JSON.stringify({ error: 'Failed to save user message' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = aiService.generateSmartStreamingResponse(aiMessages, {
            systemPrompt,
            maxTokens: 1000,
            temperature: 0.7
          })

          let aiResponse: AIResponse | null = null
          
          // Use proper async generator handling
          while (true) {
            const { value, done } = await generator.next()
            
            if (done) {
              // Generator completed, value is the final AIResponse
              aiResponse = value as AIResponse
              break
            } else {
              // Generator yielded a string chunk
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ chunk: value })}\n\n`))
            }
          }
          
          console.log(`🔍 Streaming generator completed: aiResponse=${!!aiResponse}`)
          
          if (aiResponse) {
            console.log('✅ Streaming completed successfully')
            console.log(`💾 Attempting to save assistant message: ${aiResponse.response.length} chars, ${aiResponse.tokensUsed} tokens, $${aiResponse.costUsd.toFixed(4)}`)
            
            // Save assistant message with metadata - use service role client to ensure it saves
            const { data: insertedMessage, error: assistantMessageError } = await serviceSupabase.from('chat_messages').insert({
              session_id: session.id,
              role: 'assistant',
              content: aiResponse.response,
              tokens_used: aiResponse.tokensUsed,
              cost_usd: aiResponse.costUsd,
              confidence_score: aiResponse.confidenceScore,
              response_time_ms: aiResponse.responseTimeMs,
            }).select()

            if (assistantMessageError) {
              console.error('❌ Failed to save assistant message:', assistantMessageError)
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: 'Failed to save assistant message' })}\n\n`))
              controller.close()
              return
            }
            
            console.log(`✅ Assistant message saved successfully:`, insertedMessage?.[0]?.id)

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
              // Continue anyway, message was saved
            }

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
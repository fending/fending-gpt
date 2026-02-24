import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, extractSessionToken } from '@/lib/auth/middleware'
import { generateText } from 'ai'
import { getAnthropicModel } from '@/lib/ai/models'

export async function GET(request: NextRequest) {
  try {
    // Verify admin access with optimized middleware
    const sessionToken = extractSessionToken(request)
    const authResult = await requireAdmin(sessionToken!)
    
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 500 })
    }

    // Use service role for admin operations (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get conversations with user and AI messages combined
    const { data: sessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select(`
        id,
        email,
        created_at,
        chat_messages!inner (
          id,
          role,
          content,
          tokens_used,
          cost_usd,
          confidence_score,
          response_time_ms,
          question_type,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (sessionsError) {
      throw sessionsError
    }

    // Transform data to conversation pairs (user question + AI answer)
    const conversations: Array<{
      id: string
      session_id: string
      email: string
      user_message: string
      ai_response: string
      created_at: string
      question_type?: string | null
      confidence_score?: number | null
      response_time_ms?: number | null
      quality_rating?: number
      is_approved?: boolean
      admin_notes?: string | null
      extracted_knowledge?: Array<{
        category: string
        title: string
        content: string
        tags: string[]
      }> | null
    }> = []
    
    sessions?.forEach(session => {
      const messages = (session.chat_messages || []).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      
      console.log(`🔍 Session ${session.id}: ${messages.length} messages`)
      console.log(`📝 Message roles: ${messages.map(m => m.role).join(', ')}`)
      
      // Group messages into conversation pairs
      for (let i = 0; i < messages.length - 1; i += 2) {
        const userMessage = messages[i]
        const aiMessage = messages[i + 1]
        
        console.log(`👥 Pairing attempt ${i}: user=${userMessage?.role}, ai=${aiMessage?.role}`)
        
        if (userMessage?.role === 'user' && aiMessage?.role === 'assistant') {
          console.log(`✅ Valid conversation pair found for session ${session.id}`)
          conversations.push({
            id: `${session.id}-${userMessage.id}`,
            session_id: session.id,
            email: session.email,
            user_message: userMessage.content,
            ai_response: aiMessage.content,
            question_type: aiMessage.question_type,
            confidence_score: aiMessage.confidence_score,
            response_time_ms: aiMessage.response_time_ms,
            created_at: userMessage.created_at,
            quality_rating: undefined, // Will be set from training_conversations table
            is_approved: false,
            admin_notes: null
          })
        } else {
          console.log(`❌ Invalid pair for session ${session.id}: user=${userMessage?.role}, ai=${aiMessage?.role}`)
        }
      }
    })

    // Get existing training data (including extracted_knowledge)
    const { data: trainingData } = await supabase
      .from('training_conversations')
      .select('original_session_id, quality_rating, is_approved, admin_notes, extracted_knowledge')

    // Merge training data with conversations
    const trainingMap = new Map()
    trainingData?.forEach(training => {
      trainingMap.set(training.original_session_id, training)
    })

    conversations.forEach(conv => {
      const training = trainingMap.get(conv.session_id)
      if (training) {
        conv.quality_rating = training.quality_rating
        conv.is_approved = training.is_approved
        conv.admin_notes = training.admin_notes
        conv.extracted_knowledge = training.extracted_knowledge
      }
    })

    console.log(`📊 Total conversations found: ${conversations.length}`)
    console.log(`📋 Recent conversations:`, conversations.slice(0, 3).map(c => ({
      id: c.id,
      email: c.email,
      user_message: c.user_message.slice(0, 50) + '...',
      ai_response: c.ai_response.slice(0, 50) + '...',
      created_at: c.created_at
    })))
    
    return NextResponse.json(conversations)

  } catch (error) {
    console.error('Error fetching training conversations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { conversationId, quality_rating, admin_notes, is_approved } = await request.json()

    if (!conversationId || !quality_rating) {
      return NextResponse.json(
        { error: 'Conversation ID and quality rating are required' },
        { status: 400 }
      )
    }

    // Verify admin access with optimized middleware
    const sessionToken = extractSessionToken(request)
    const authResult = await requireAdmin(sessionToken!)
    
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 500 })
    }

    // Use service role for admin operations (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Extract session ID from conversation ID (format: sessionId-messageId)
    // Session IDs are UUIDs with dashes, so we need to reconstruct properly
    const parts = conversationId.split('-')
    if (parts.length < 5) {
      return NextResponse.json(
        { error: 'Invalid conversation ID format' },
        { status: 400 }
      )
    }
    // Reconstruct UUID: first 5 parts joined with dashes (8-4-4-4-12 format)
    const sessionId = parts.slice(0, 5).join('-')

    // Check if training conversation already exists
    const { data: existingTraining } = await supabase
      .from('training_conversations')
      .select('id')
      .eq('original_session_id', sessionId)
      .single()

    let upsertError
    if (existingTraining) {
      // Update existing
      const { error } = await supabase
        .from('training_conversations')
        .update({
          quality_rating,
          admin_notes: admin_notes || null,
          is_approved: is_approved || false,
          reviewed_by: authResult.session!.email,
          reviewed_at: new Date().toISOString()
        })
        .eq('original_session_id', sessionId)
      upsertError = error
    } else {
      // Insert new
      const { error } = await supabase
        .from('training_conversations')
        .insert({
          original_session_id: sessionId,
          quality_rating,
          admin_notes: admin_notes || null,
          is_approved: is_approved || false,
          reviewed_by: authResult.session!.email,
          reviewed_at: new Date().toISOString()
        })
      upsertError = error
    }

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      throw upsertError
    }

    // Fire-and-forget: extract knowledge on high ratings (>= 4)
    if (quality_rating >= 4) {
      extractKnowledgeFromConversation(sessionId).catch(err => {
        console.error('Knowledge extraction failed (non-blocking):', err)
      })
    }

    // Log RAG entry IDs for low-rated conversations (<= 2)
    if (quality_rating <= 2) {
      logLowRatedConversationContext(sessionId).catch(err => {
        console.error('Low-rating context logging failed (non-blocking):', err)
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating training conversation:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
}

/**
 * Fire-and-forget: Extract structured knowledge from a highly-rated conversation
 * using Claude Haiku, then save to training_conversations.extracted_knowledge.
 */
async function extractKnowledgeFromConversation(sessionId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: messages, error: messagesError } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (messagesError || !messages || messages.length < 2) {
    console.warn('No messages found for knowledge extraction, session:', sessionId)
    return
  }

  const qaPairs: string[] = []
  for (let i = 0; i < messages.length - 1; i++) {
    if (messages[i].role === 'user' && messages[i + 1]?.role === 'assistant') {
      qaPairs.push(`Q: ${messages[i].content}\nA: ${messages[i + 1].content}`)
    }
  }

  if (qaPairs.length === 0) {
    console.warn('No valid Q&A pairs found for knowledge extraction, session:', sessionId)
    return
  }

  const qaText = qaPairs.join('\n\n---\n\n')

  const { text } = await generateText({
    model: getAnthropicModel('haiku'),
    system: `Extract key facts about Brian Fending from this Q&A pair. Return JSON array of knowledge entries: [{"category": "experience|skills|projects|education|personal|company|affiliations", "title": "short title", "content": "the factual content", "tags": ["tag1", "tag2"]}]. Only extract genuinely new/useful facts. Return empty array [] if no useful knowledge. Return ONLY valid JSON, no markdown fences or explanation.`,
    messages: [{ role: 'user', content: qaText }],
    maxOutputTokens: 1000,
    temperature: 0.3,
  })

  let extractedKnowledge: Array<{
    category: string
    title: string
    content: string
    tags: string[]
  }> = []

  try {
    const parsed = JSON.parse(text.trim())
    if (Array.isArray(parsed)) {
      extractedKnowledge = parsed.filter(
        (entry: Record<string, unknown>) =>
          entry &&
          typeof entry.category === 'string' &&
          typeof entry.title === 'string' &&
          typeof entry.content === 'string'
      )
    }
  } catch (parseError) {
    console.error('Failed to parse knowledge extraction JSON:', parseError)
    console.error('Raw response:', text)
    return
  }

  const { error: updateError } = await supabase
    .from('training_conversations')
    .update({ extracted_knowledge: extractedKnowledge })
    .eq('original_session_id', sessionId)

  if (updateError) {
    console.error('Failed to save extracted knowledge:', updateError)
  } else {
    console.log(`Extracted ${extractedKnowledge.length} knowledge entries for session ${sessionId}`)
  }
}

/**
 * Fire-and-forget: Log RAG entry IDs used in low-rated conversations
 * so admins can identify which KB entries may need review.
 */
async function logLowRatedConversationContext(sessionId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('id, rag_entry_ids')
    .eq('session_id', sessionId)
    .eq('role', 'assistant')

  if (error) {
    console.error('Failed to fetch messages for low-rating review:', error)
    return
  }

  const ragEntryIds = messages
    ?.filter(m => m.rag_entry_ids && m.rag_entry_ids.length > 0)
    .flatMap(m => m.rag_entry_ids) || []

  if (ragEntryIds.length > 0) {
    console.warn(
      `LOW-RATED CONVERSATION (session: ${sessionId}) - RAG entry IDs used: [${ragEntryIds.join(', ')}]. ` +
      `These knowledge base entries may need review.`
    )
  } else {
    console.warn(
      `LOW-RATED CONVERSATION (session: ${sessionId}) - No RAG entry IDs recorded for this session.`
    )
  }
}
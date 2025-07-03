import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, extractSessionToken } from '@/lib/auth/middleware'

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
    }> = []
    
    sessions?.forEach(session => {
      const messages = session.chat_messages || []
      
      // Group messages into conversation pairs
      for (let i = 0; i < messages.length - 1; i += 2) {
        const userMessage = messages[i]
        const aiMessage = messages[i + 1]
        
        if (userMessage?.role === 'user' && aiMessage?.role === 'assistant') {
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
        }
      }
    })

    // Get existing training data
    const { data: trainingData } = await supabase
      .from('training_conversations')
      .select('original_session_id, quality_rating, is_approved, admin_notes')

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
      }
    })

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

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating training conversation:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
}
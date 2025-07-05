import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, extractSessionToken } from '@/lib/auth/middleware'
import { OpenAIEmbeddingService } from '@/lib/embeddings/openai'

export async function POST(request: NextRequest) {
  try {
    const { category, title, content, tags, priority, source } = await request.json()

    if (!category || !title || !content) {
      return NextResponse.json(
        { error: 'Category, title, and content are required' },
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

    // Generate embedding for the new entry
    const embeddingService = new OpenAIEmbeddingService()
    let embedding: number[] | null = null
    
    try {
      const entryText = embeddingService.formatKnowledgeEntry({
        category,
        title,
        content,
        tags: tags || []
      })
      embedding = await embeddingService.generateEmbedding(entryText)
      console.log(`✅ Generated embedding for new entry: ${category} - ${title}`)
    } catch (embeddingError) {
      console.error('Failed to generate embedding:', embeddingError)
      // Continue without embedding - can be generated later
    }

    // Insert new knowledge base entry with embedding
    const { data: newEntry, error: insertError } = await supabase
      .from('knowledge_base')
      .insert({
        category,
        title,
        content,
        tags: tags || [],
        priority: priority || 3,
        source: source || 'manual',
        is_active: true,
        confidence: 1.0,
        embedding: embedding
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({ 
      success: true, 
      entry: newEntry,
      embeddingGenerated: embedding !== null
    })

  } catch (error) {
    console.error('Error creating knowledge base entry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Get all knowledge base entries
    const { data: entries, error: entriesError } = await supabase
      .from('knowledge_base')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (entriesError) {
      throw entriesError
    }

    return NextResponse.json(entries)

  } catch (error) {
    console.error('Error fetching knowledge base:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Use service role for admin operations (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { id, category, title, content, tags, priority } = await request.json()

    if (!id || !title || !content || !category) {
      return NextResponse.json(
        { error: 'ID, title, content, and category are required' },
        { status: 400 }
      )
    }

    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.replace('Bearer ', '')

    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token required' }, { status: 401 })
    }

    // Verify admin access
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('email, status, expires_at')
      .eq('token', sessionToken)
      .eq('status', 'active')
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Check if email is in admin_users table
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('email')
      .eq('email', session.email)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Generate new embedding for the updated entry
    const embeddingService = new OpenAIEmbeddingService()
    let embedding: number[] | null = null
    
    try {
      const entryText = embeddingService.formatKnowledgeEntry({
        category,
        title,
        content,
        tags: tags || []
      })
      embedding = await embeddingService.generateEmbedding(entryText)
      console.log(`✅ Generated embedding for updated entry: ${category} - ${title}`)
    } catch (embeddingError) {
      console.error('Failed to generate embedding:', embeddingError)
      // Continue without embedding - can be generated later
    }

    // Update knowledge base entry with new embedding
    const { data: updatedEntry, error: updateError } = await supabase
      .from('knowledge_base')
      .update({
        category,
        title,
        content,
        tags: tags || [],
        priority: priority || 3,
        updated_at: new Date().toISOString(),
        embedding: embedding
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ 
      success: true, 
      entry: updatedEntry,
      embeddingGenerated: embedding !== null
    })

  } catch (error) {
    console.error('Error updating knowledge base entry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Use service role for admin operations (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      )
    }

    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.replace('Bearer ', '')

    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token required' }, { status: 401 })
    }

    // Verify admin access
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('email, status, expires_at')
      .eq('token', sessionToken)
      .eq('status', 'active')
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Check if email is in admin_users table
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('email')
      .eq('email', session.email)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Delete knowledge base entry
    const { error: deleteError } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting knowledge base entry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
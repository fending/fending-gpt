import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, extractSessionToken } from '@/lib/auth/middleware'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { category, title, content, tags, priority } = await request.json()

    if (!title || !content || !category) {
      return NextResponse.json(
        { error: 'Title, content, and category are required' },
        { status: 400 }
      )
    }

    // Verify admin access with optimized middleware
    const sessionToken = extractSessionToken(request)
    const authResult = await requireAdmin(sessionToken!)
    
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update knowledge base entry
    const { data: updatedEntry, error: updateError } = await supabase
      .from('knowledge_base')
      .update({
        category,
        title,
        content,
        tags: tags || [],
        priority: priority || 3,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json(updatedEntry)

  } catch (error) {
    console.error('Error updating knowledge base entry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Verify admin access with optimized middleware
    const sessionToken = extractSessionToken(request)
    const authResult = await requireAdmin(sessionToken!)
    
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
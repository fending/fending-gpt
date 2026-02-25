import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, extractSessionToken } from '@/lib/auth/middleware'
import { ingestDocument } from '@/lib/knowledge/ingest'

export async function POST(request: NextRequest) {
  try {
    const { text, source, defaultPriority, entries: selectedEntries } = await request.json()

    // Verify admin access
    const sessionToken = extractSessionToken(request)
    const authResult = await requireAdmin(sessionToken!)

    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 500 })
    }

    // If selectedEntries is provided, this is the "confirm import" step
    if (selectedEntries && Array.isArray(selectedEntries)) {
      if (selectedEntries.length === 0) {
        return NextResponse.json(
          { error: 'No entries selected for import' },
          { status: 400 }
        )
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const insertData = selectedEntries.map((entry: {
        category: string
        title: string
        content: string
        tags: string[]
        priority: number
        source: string
        embedding: number[]
      }) => ({
        category: entry.category,
        title: entry.title,
        content: entry.content,
        tags: entry.tags,
        priority: entry.priority,
        source: entry.source,
        is_active: true,
        confidence: 1.0,
        embedding: entry.embedding?.length > 0 ? entry.embedding : null,
      }))

      const { data: inserted, error: insertError } = await supabase
        .from('knowledge_base')
        .insert(insertData)
        .select()

      if (insertError) {
        console.error('Database insert error:', insertError)
        throw insertError
      }

      return NextResponse.json({
        success: true,
        imported: inserted?.length || 0,
      })
    }

    // Otherwise, this is the "process document" step -- chunk, categorize, embed
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text content is required' },
        { status: 400 }
      )
    }

    // Run the ingestion pipeline (does NOT insert into DB)
    const result = await ingestDocument(text.trim(), {
      source: source || 'document',
      defaultPriority: defaultPriority || 3,
    })

    if (result.entries.length === 0) {
      return NextResponse.json(
        { error: 'No entries could be generated from the provided text', stats: result.stats },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      entries: result.entries,
      stats: result.stats,
    })
  } catch (error) {
    console.error('Error ingesting document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

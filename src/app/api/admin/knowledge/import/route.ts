import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, extractSessionToken } from '@/lib/auth/middleware'

interface ImportEntry {
  category: 'affiliations' | 'experience' | 'skills' | 'projects' | 'education' | 'personal' | 'company'
  title: string
  content: string
  tags: string[]
  priority: number
}

export async function POST(request: NextRequest) {
  try {
    const { entries }: { entries: ImportEntry[] } = await request.json()

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: 'No valid entries provided' },
        { status: 400 }
      )
    }

    // Verify admin access
    const sessionToken = extractSessionToken(request)
    const authResult = await requireAdmin(sessionToken!)
    
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Validate each entry
    const validCategories = ['affiliations', 'experience', 'skills', 'projects', 'education', 'personal', 'company']
    const validatedEntries = []

    for (const entry of entries) {
      // Validate required fields
      if (!entry.title || !entry.content || !entry.category) {
        continue // Skip invalid entries
      }

      // Validate category
      if (!validCategories.includes(entry.category)) {
        continue // Skip invalid categories
      }

      // Validate priority
      if (!entry.priority || entry.priority < 1 || entry.priority > 5) {
        entry.priority = 3 // Default priority
      }

      // Ensure tags is an array
      if (!Array.isArray(entry.tags)) {
        entry.tags = []
      }

      validatedEntries.push({
        category: entry.category,
        title: entry.title.trim(),
        content: entry.content.trim(),
        tags: entry.tags.filter(tag => tag && tag.trim()),
        priority: entry.priority,
        source: 'import',
        is_active: true
      })
    }

    if (validatedEntries.length === 0) {
      return NextResponse.json(
        { error: 'No valid entries to import' },
        { status: 400 }
      )
    }

    // Insert entries into database
    const { data, error } = await supabase
      .from('knowledge_base')
      .insert(validatedEntries)
      .select()

    if (error) {
      console.error('Database insert error:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
      total: entries.length,
      skipped: entries.length - validatedEntries.length
    })

  } catch (error) {
    console.error('Error importing knowledge entries:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
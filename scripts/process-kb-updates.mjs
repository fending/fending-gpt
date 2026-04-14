#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envFile = readFileSync(resolve(import.meta.dirname, '..', '.env.local'), 'utf-8')
for (const line of envFile.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i === -1) continue
  process.env[t.slice(0, i)] = t.slice(i + 1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const file = readFileSync(resolve(import.meta.dirname, '..', 'context', 'KB_UPDATES.md'), 'utf-8')

// Fetch all IDs for prefix resolution
const { data: allRows } = await supabase.from('knowledge_base').select('id, title')
function resolveId(prefix) {
  const m = allRows.filter(r => r.id.startsWith(prefix))
  return m.length >= 1 ? m[0].id : null
}

// Parse entries
const entryRegex = /^### (?:\[([a-f0-9]+)\] )?(.+)$/gm
const entries = []
let match
while ((match = entryRegex.exec(file)) !== null) {
  const idPrefix = match[1] || null
  const title = match[2]
  const after = file.slice(match.index + match[0].length)
  const nextEntry = after.search(/^### /m)
  const block = nextEntry !== -1 ? after.slice(0, nextEntry) : after

  const catMatch = block.match(/^Category:\s*(\S+)/m)
  const priMatch = block.match(/Priority:\s*(\d)/m)
  const tagsMatch = block.match(/^Tags:\s*(.+)$/m)

  // Content is everything after the Tags line until ---
  const tagsEnd = block.indexOf(tagsMatch[0]) + tagsMatch[0].length
  const separator = block.indexOf('\n---', tagsEnd)
  const content = block.slice(tagsEnd, separator !== -1 ? separator : undefined).trim()

  entries.push({
    idPrefix,
    title,
    category: catMatch ? catMatch[1] : null,
    priority: priMatch ? parseInt(priMatch[1]) : null,
    tags: tagsMatch ? tagsMatch[1].split(',').map(t => t.trim()) : null,
    content,
  })
}

// Split into updates (have ID prefix) and inserts (no ID prefix)
const updates = entries.filter(e => e.idPrefix)
const inserts = entries.filter(e => !e.idPrefix)

console.log(`Parsed ${entries.length} entries: ${updates.length} updates, ${inserts.length} new\n`)

// Process updates
for (const entry of updates) {
  const fullId = resolveId(entry.idPrefix)
  if (!fullId) {
    console.warn(`UPDATE [${entry.idPrefix}] -- no matching row`)
    continue
  }

  const payload = {
    content: entry.content,
    title: entry.title,
    updated_at: new Date().toISOString(),
  }
  if (entry.priority) payload.priority = entry.priority
  if (entry.tags) payload.tags = entry.tags

  const { data, error } = await supabase
    .from('knowledge_base')
    .update(payload)
    .eq('id', fullId)
    .select('id, title')

  if (error) {
    console.error(`UPDATE [${entry.idPrefix}] FAILED:`, error.message)
  } else {
    console.log(`UPDATED [${entry.idPrefix}] "${data[0].title}"`)
  }
}

// Process inserts
for (const entry of inserts) {
  const payload = {
    category: entry.category,
    title: entry.title,
    content: entry.content,
    tags: entry.tags,
    priority: entry.priority,
    source: 'manual',
    is_active: true,
    confidence: 1.0,
  }

  const { data, error } = await supabase
    .from('knowledge_base')
    .insert(payload)
    .select('id, title, category')

  if (error) {
    console.error(`INSERT "${entry.title}" FAILED:`, error.message)
  } else {
    console.log(`INSERTED [${data[0].id.slice(0, 8)}] ${data[0].category}: "${data[0].title}"`)
  }
}

console.log(`\nDone. ${updates.length} updated, ${inserts.length} inserted.`)

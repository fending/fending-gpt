#!/usr/bin/env node
/**
 * Process knowledge-review.md actions against Supabase knowledge_base table.
 * Run: node scripts/process-kb-review.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually
const envFile = readFileSync(resolve(import.meta.dirname, '..', '.env.local'), 'utf-8')
for (const line of envFile.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx)
  const value = trimmed.slice(eqIdx + 1)
  process.env[key] = value
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const reviewFile = readFileSync(
  resolve(import.meta.dirname, '..', 'knowledge-review.md'),
  'utf-8'
)

// Parse entries from the review file
const entries = []
const entryRegex = /^### \[([a-f0-9]+)\] (.+)$/gm
let match

while ((match = entryRegex.exec(reviewFile)) !== null) {
  const idPrefix = match[1]
  const title = match[2]
  const afterHeading = reviewFile.slice(match.index + match[0].length)

  // Extract action
  const actionMatch = afterHeading.match(/^Action:\s*(\w+)/m)
  const action = actionMatch ? actionMatch[1].trim() : 'KEEP'

  // Extract content (everything between Action line and next ---)
  const actionEnd = afterHeading.indexOf(actionMatch[0]) + actionMatch[0].length
  const nextSeparator = afterHeading.indexOf('\n---', actionEnd)
  const content = afterHeading
    .slice(actionEnd, nextSeparator !== -1 ? nextSeparator : undefined)
    .trim()

  // Extract metadata
  const categoryMatch = afterHeading.match(/^Category:\s*(\w+)/m)
  const priorityMatch = afterHeading.match(/Priority:\s*(\d)/m)
  const tagsMatch = afterHeading.match(/^Tags:\s*(.+)$/m)

  entries.push({
    idPrefix,
    title,
    action,
    content,
    category: categoryMatch ? categoryMatch[1] : null,
    priority: priorityMatch ? parseInt(priorityMatch[1]) : null,
    tags: tagsMatch && tagsMatch[1] !== '(none)'
      ? tagsMatch[1].split(',').map(t => t.trim())
      : null,
  })
}

console.log(`Parsed ${entries.length} entries from review file\n`)

// Tally actions
const actions = {}
for (const e of entries) {
  actions[e.action] = (actions[e.action] || 0) + 1
}
console.log('Action summary:', actions)
console.log()

// Fetch all KB IDs to resolve prefixes
const { data: allRows, error: fetchError } = await supabase
  .from('knowledge_base')
  .select('id, title')

if (fetchError) {
  console.error('Failed to fetch knowledge_base:', fetchError.message)
  process.exit(1)
}

function resolveId(prefix) {
  const matches = allRows.filter(r => r.id.startsWith(prefix))
  if (matches.length === 1) return matches[0].id
  if (matches.length === 0) return null
  console.warn(`  Multiple matches for prefix ${prefix}, using first`)
  return matches[0].id
}

// Process DEPRECATE entries
const deprecates = entries.filter(e => e.action === 'DEPRECATE')
for (const entry of deprecates) {
  const fullId = resolveId(entry.idPrefix)
  if (!fullId) {
    console.warn(`DEPRECATE [${entry.idPrefix}] -- no matching row found`)
    continue
  }

  const { data, error } = await supabase
    .from('knowledge_base')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', fullId)
    .select('id, title')

  if (error) {
    console.error(`DEPRECATE [${entry.idPrefix}] FAILED:`, error.message)
  } else {
    console.log(`DEPRECATE [${entry.idPrefix}] "${data[0].title}" -- deactivated`)
  }
}

// Process UPDATE entries
const updates = entries.filter(e => e.action === 'UPDATE')
for (const entry of updates) {
  const fullId = resolveId(entry.idPrefix)
  if (!fullId) {
    console.warn(`UPDATE [${entry.idPrefix}] -- no matching row found`)
    continue
  }

  const updatePayload = {
    content: entry.content,
    updated_at: new Date().toISOString(),
  }

  if (entry.title) updatePayload.title = entry.title
  if (entry.priority) updatePayload.priority = entry.priority
  if (entry.tags) updatePayload.tags = entry.tags

  const { data, error } = await supabase
    .from('knowledge_base')
    .update(updatePayload)
    .eq('id', fullId)
    .select('id, title')

  if (error) {
    console.error(`UPDATE [${entry.idPrefix}] FAILED:`, error.message)
  } else {
    console.log(`UPDATE [${entry.idPrefix}] "${data[0].title}"`)
  }
}

// Summary
const keepCount = entries.filter(e => e.action === 'KEEP').length
console.log(`\nDone. ${keepCount} kept, ${deprecates.length} deprecated, ${updates.length} updated.`)
console.log('\nNote: Updated entries need embedding regeneration. Run:')
console.log('  POST /api/admin/embeddings/generate')

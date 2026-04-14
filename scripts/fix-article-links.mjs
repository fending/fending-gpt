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

const { data: articles, error } = await supabase
  .from('knowledge_base')
  .select('id, title, content')
  .eq('is_active', true)
  .like('title', 'Article:%')

if (error) { console.error(error); process.exit(1) }

let updated = 0
for (const a of articles) {
  // Replace bare "brianfending.com/articles/" with full URL
  // but skip ones already having https://www.
  if (a.content.includes('https://www.brianfending.com/articles/')) continue

  const fixed = a.content.replace(
    /(?:Published .+? at )brianfending\.com\/articles\//,
    (match) => match.replace('brianfending.com/articles/', 'https://www.brianfending.com/articles/')
  )

  if (fixed === a.content) {
    console.log(`SKIP [${a.id.slice(0, 8)}] no bare link found`)
    continue
  }

  const { error: updateError } = await supabase
    .from('knowledge_base')
    .update({ content: fixed, updated_at: new Date().toISOString() })
    .eq('id', a.id)

  if (updateError) {
    console.error(`FAILED [${a.id.slice(0, 8)}]:`, updateError.message)
  } else {
    console.log(`FIXED [${a.id.slice(0, 8)}] ${a.title}`)
    updated++
  }
}

console.log(`\nDone. ${updated} entries updated.`)

#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envFile = readFileSync(resolve(import.meta.dirname, '..', '.env.local'), 'utf-8')
for (const line of envFile.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  process.env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const entries = [
  {
    category: 'podcast',
    title: 'The Oversight',
    content: `The Oversight is Brian Fending's podcast featuring long-form guest conversations with people charged with oversight of risk in all its forms -- what actually works, and where it fails. The show is currently in production. Format: guest-driven conversations exploring risk oversight across industries. Topics align with Brian's expertise in technology risk, AI governance, cybersecurity, and enterprise risk management. Listeners can pitch guests or topics through the contact form at brianfending.com with subject line "podcast-guest". Details at brianfending.com/podcasts.`,
    tags: ['podcast', 'the-oversight', 'risk-management', 'governance', 'guest-interviews', 'in-production'],
    priority: 4,
    source: 'manual',
    is_active: true,
    confidence: 1.0,
  },
  {
    category: 'podcast',
    title: 'Products & Companies',
    content: `Products & Companies is Brian Fending's upcoming podcast featuring scripted, research-heavy solo analysis of products and companies, and what their decisions say about the wider technology market. The show is currently in development (coming soon). Format: solo analysis episodes with deep research. Topics cover product strategy, company decisions, and technology market trends. Listeners can pitch topics through the contact form at brianfending.com with subject line "podcast-guest". Details at brianfending.com/podcasts.`,
    tags: ['podcast', 'products-and-companies', 'product-analysis', 'technology-market', 'solo-show', 'coming-soon'],
    priority: 3,
    source: 'manual',
    is_active: true,
    confidence: 1.0,
  },
]

for (const entry of entries) {
  const { data, error } = await supabase
    .from('knowledge_base')
    .insert(entry)
    .select('id, title, category')

  if (error) {
    console.error(`FAILED: "${entry.title}" --`, error.message)
  } else {
    console.log(`INSERTED [${data[0].id.slice(0, 8)}] ${data[0].category}: "${data[0].title}"`)
  }
}

console.log('Done.')

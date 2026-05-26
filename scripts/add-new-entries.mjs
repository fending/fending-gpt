#!/usr/bin/env node
/**
 * Add new knowledge base entries for Ordovera Advisory and MADE, Inc.
 * Run: node scripts/add-new-entries.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local
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

const newEntries = [
  {
    category: 'company',
    title: 'Ordovera Advisory',
    content: `Ordovera Advisory is Brian Fending's AI governance and enablement practice, operating as a practice of MADE, Inc. The firm helps mid-market organizations build AI governance (managing risk) and AI enablement (driving adoption) in parallel. Central thesis: "An AI policy is not an AI strategy." Services include free self-serve readiness assessments, facilitated diagnostics, half-day and full-day workshops, 4-week cohort programs, custom advisory engagements, and solutions development (custom tools, dashboards, platforms). Three-phase engagement model: Assess (2-3 weeks), Build (4-8 weeks), Manage (3-18 months fractional leadership with planned handoff). Ordovera emphasizes that governance without enablement creates shadow AI, while enablement without governance accumulates unmanaged risk. Provides a free AI Employee Usage Policy Template. Website: ordovera.com. Contact: brian@ordovera.com.`,
    tags: ['ordovera', 'ai-governance', 'ai-enablement', 'consulting', 'advisory', 'workshops', 'cohort-programs', 'assessments', 'mid-market'],
    priority: 5,
    source: 'manual',
    is_active: true,
    confidence: 1.0,
  },
  {
    category: 'company',
    title: 'MADE, Inc.',
    content: `MADE, Inc. is Brian Fending's fractional technology leadership firm providing senior technology leadership and delivery. Three engagement models: Advisory Retainer (20 hours/month of guidance on architecture, vendor evaluation, hiring, and strategy), Fractional CIO (20 hours/week of embedded leadership covering strategy, operations, team management, and delivery), and Project-Based (scoped engagements with defined deliverables from requirements through launch). Target clients include SMBs, growing companies, nonprofits, and organizations without full-time CIO capacity. Key differentiator: direct access to a senior practitioner who owns the outcome, not a project manager relaying messages. Ordovera Advisory operates as a practice of MADE, Inc. Website: madeinc.xyz. Contact: brian@madeinc.xyz.`,
    tags: ['made-inc', 'fractional-cio', 'advisory', 'technology-leadership', 'consulting', 'smb', 'nonprofit'],
    priority: 5,
    source: 'manual',
    is_active: true,
    confidence: 1.0,
  },
  {
    category: 'experience',
    title: 'Managing Director at Ordovera Advisory',
    content: `Brian is the Managing Director of Ordovera Advisory, an AI governance and enablement practice he founded. He leads all client engagements including assessments, workshops, cohort programs, and fractional advisory. His approach operationalizes governance and enablement simultaneously using a three-phase model (Assess, Build, Manage). Brian built this practice from his experience implementing AI governance at AAPL and his recognition that most organizations hire one "AI person" who excels at governance or enablement but rarely both. Ordovera serves mid-market organizations that need to operationalize AI strategy without dedicated compliance teams or large research budgets.`,
    tags: ['ordovera', 'managing-director', 'ai-governance', 'ai-enablement', 'consulting', 'current-role'],
    priority: 5,
    source: 'manual',
    is_active: true,
    confidence: 1.0,
  },
  {
    category: 'experience',
    title: 'Principal at MADE, Inc.',
    content: `Brian is the Principal of MADE, Inc., a fractional technology leadership firm he founded in 2015 as an evolution of his earlier consulting practices (Fending Group, Monster Assembly). MADE provides senior technology leadership to SMBs, nonprofits, and growing companies that need CIO-level expertise without full-time overhead. Engagement models include advisory retainers, fractional CIO packages, and project-based delivery. Ordovera Advisory operates as a practice of MADE, Inc. Brian's consulting-to-executive career pattern -- earning trust through fractional engagements that converted to full-time leadership at AAPL -- is central to his professional identity.`,
    tags: ['made-inc', 'principal', 'fractional-cio', 'consulting', 'technology-leadership', 'current-role'],
    priority: 5,
    source: 'manual',
    is_active: true,
    confidence: 1.0,
  },
  {
    category: 'projects',
    title: 'Ordovera Counterpoint Model',
    content: `The Counterpoint Model is Ordovera Advisory's methodology for parallel AI governance and enablement. It addresses the observation that organizations typically assess around 14/20 on governance maturity but only 8/20 on enablement, creating an approximate 45% risk accumulation gap. The model treats governance and enablement as complementary functions that must be built together: governance answers "should we?" while enablement answers "how do we adopt?" The model is operationalized through assessments, workshops, cohort programs, and advisory engagements. It includes tools like shadow AI discovery, approved tool catalogs, vendor evaluation frameworks, and champion networks.`,
    tags: ['ordovera', 'counterpoint-model', 'ai-governance', 'ai-enablement', 'methodology', 'framework'],
    priority: 4,
    source: 'manual',
    is_active: true,
    confidence: 1.0,
  },
]

console.log(`Inserting ${newEntries.length} new entries...\n`)

for (const entry of newEntries) {
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

console.log('\nDone. Run embedding generation to index these entries.')

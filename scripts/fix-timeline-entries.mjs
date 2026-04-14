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

const { data: allRows } = await supabase
  .from('knowledge_base')
  .select('id, title')

function resolveId(prefix) {
  const m = allRows.filter(r => r.id.startsWith(prefix))
  return m.length === 1 ? m[0].id : null
}

const updates = [
  {
    prefix: '7d4e9ec4',
    title: 'Principal/Owner - Fractional Technology Consulting (2010-2018)',
    content: `Led fractional technology consulting practices operating as Fending Group (2010-2012), then Monster Assembly (2012-2015), then MADE, Inc. (2015-2018). Grew practice, leading 100+ technology projects across multiple verticals. Designed architecture for world's first at-scale iPad ordering system at JFK T5 with custom Micros POS integration. Developed proprietary solutions including graph-based CMS combining Neo4j and Lucene. Transitioned practice to focus on IT strategy and GRC for enterprise clients. Paused fractional practice in 2019 to join AAPL full-time (SVP IT, then CIO through March 2025).`,
  },
  {
    prefix: 'e523d9b0',
    title: 'Principal at MADE, Inc.',
    content: `Brian is the Principal of MADE, Inc., a fractional technology leadership firm. The firm evolved from his earlier consulting practices: Fending Group (2010-2012), Monster Assembly (2012-2015), and MADE, Inc. (2015-present). Brian ran fractional practices from 2010-2018, paused to work directly for AAPL as SVP IT and then CIO (2019-2025), and resumed MADE, Inc. in 2025. In 2026, Brian started Ordovera Advisory as a practice of MADE, Inc. to focus on AI governance and enablement. MADE provides senior technology leadership to SMBs, nonprofits, and growing companies that need CIO-level expertise without full-time overhead. Engagement models include advisory retainers, fractional CIO packages, and project-based delivery.`,
  },
  {
    prefix: '79c5e006',
    title: 'Managing Director at Ordovera Advisory',
    content: `Brian founded Ordovera Advisory in 2026 as a practice of MADE, Inc., focused on AI governance and enablement for mid-market organizations. He leads all client engagements including assessments, workshops, cohort programs, and fractional advisory. His approach operationalizes governance and enablement simultaneously using the Counterpoint Model and a three-phase engagement (Assess, Build, Manage). Brian built this practice from his experience implementing AI governance at AAPL starting in early 2023 and his recognition that most organizations hire one "AI person" who excels at governance or enablement but rarely both. Ordovera serves organizations that need to operationalize AI strategy without dedicated compliance teams or large research budgets.`,
  },
  {
    prefix: '1fb2b902',
    title: 'Key Differentiators',
    content: `Five differentiators set Brian apart in the market: (1) Early practitioner in enterprise AI governance with production deployment experience -- he built governance frameworks and deployed AI tools across departments starting in early 2023, not just designed policies. (2) Hands-on technical background (production code, cloud migrations, security program builds) combined with C-suite and board-level communication -- he can speak to the audit committee, architect solutions, and write the code. (3) Consistent "doing more with less" track record -- delivering enterprise-grade results under capital constraints (~$1M IT budget). (4) Multi-jurisdictional regulatory compliance across healthcare, international privacy (GDPR, KSA PDPL), and financial services (SEC/FINRA) contexts. (5) Career pattern of fractional practice (2010-2018), direct executive leadership at AAPL (2019-2025), and resuming fractional practice with MADE, Inc. and Ordovera Advisory (2025-present) -- demonstrating trust earned through results across engagement models.`,
  },
]

for (const u of updates) {
  const fullId = resolveId(u.prefix)
  if (!fullId) {
    console.error(`[${u.prefix}] -- no matching row`)
    continue
  }

  const { data, error } = await supabase
    .from('knowledge_base')
    .update({
      title: u.title,
      content: u.content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fullId)
    .select('id, title')

  if (error) {
    console.error(`[${u.prefix}] FAILED:`, error.message)
  } else {
    console.log(`UPDATED [${u.prefix}] "${data[0].title}"`)
  }
}

console.log('\nDone. Run embedding generation for updated entries.')

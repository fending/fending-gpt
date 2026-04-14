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

const entries = [
  {
    category: 'projects',
    title: 'Ordovera Plugins (Open Source)',
    content: `Open source Claude Code plugins for building, securing, and governing AI agent systems. Published at https://github.com/Ordovera/ordovera-plugins. Includes two major plugins: (1) context-setup -- scaffold, audit, align, optimize MCP tools, and upgrade context engineering files. Generates AGENTS.md files, context directories, and cascading structures from project analysis. Originally developed as part of context-engineering. (2) top10-scan -- OWASP Top 10:2025 multi-layer security audit. Orchestrates Opengrep (SAST), ZAP (DAST), and SCA alongside Claude's design-level analysis into a single synthesized report. These plugins demonstrate Brian's approach to operationalizing governance and security within AI development workflows.`,
    tags: ['open-source', 'claude-code', 'plugins', 'ai-governance', 'security', 'owasp', 'context-engineering', 'ordovera', 'github'],
    priority: 4,
    source: 'manual',
    is_active: true,
    confidence: 1.0,
  },
  {
    category: 'projects',
    title: 'Context Engineering (Open Source)',
    content: `Reusable patterns for structuring the context that AI coding assistants consume. Published at https://github.com/fending/context-engineering. Spawned from Brian's "Rethinking Team Topologies for AI-Augmented Development" article (June 2025). Copy a template, fill in your specifics, ship better code with less re-explaining. Provides four levels of context architecture: single file, context directory, cascading files, and agents & agent teams with optional Jira sync. Every file is designed to be copied and adapted, with generic placeholders describing the kind of content that belongs there rather than inventing fictional examples. Working templates at each level. The context-setup plugin in ordovera-plugins was originally developed as part of this repository.`,
    tags: ['open-source', 'context-engineering', 'ai-development', 'templates', 'claude-code', 'team-topologies', 'github'],
    priority: 4,
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

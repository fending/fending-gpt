import { createServiceRoleClient } from '@/lib/supabase/server'

interface CachedConfig {
  value: string
  fetchedAt: number
}

const configCache = new Map<string, CachedConfig>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getSystemPrompt(ragContext: string): Promise<string> {
  const template = await getConfig('system_prompt')

  if (!template) {
    console.warn('System prompt not found in database, using fallback')
    return `You are an AI assistant representing Brian Fending.\n\nHere's key information about Brian:\n${ragContext}\n\nProvide helpful, accurate responses about Brian's background and qualifications.`
  }

  return template.replace('{{RAG_CONTEXT}}', ragContext)
}

async function getConfig(key: string): Promise<string | null> {
  const cached = configCache.get(key)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.value
  }

  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', key)
      .single()

    if (error || !data) return null

    configCache.set(key, { value: data.value, fetchedAt: Date.now() })
    return data.value
  } catch {
    return cached?.value ?? null
  }
}

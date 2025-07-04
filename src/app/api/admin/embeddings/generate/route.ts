import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OpenAIEmbeddingService } from '@/lib/embeddings/openai'

export async function POST() {
  try {
    const supabase = await createClient()
    const embeddingService = new OpenAIEmbeddingService()

    console.log('🚀 Starting knowledge base embedding generation...')

    // Get all active knowledge base entries without embeddings
    const { data: entries, error: fetchError } = await supabase
      .from('knowledge_base')
      .select('id, category, title, content, tags')
      .eq('is_active', true)
      .is('embedding', null)

    if (fetchError) {
      console.error('Error fetching knowledge entries:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch knowledge entries' }, { status: 500 })
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({ 
        message: 'No entries need embedding generation',
        processed: 0
      })
    }

    console.log(`📊 Found ${entries.length} entries to process`)

    let processed = 0
    let totalTokens = 0
    let totalCost = 0

    // Process entries in batches to respect OpenAI rate limits
    const batchSize = 10
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize)
      
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(entries.length / batchSize)}`)

      try {
        // Format entries for embedding
        const texts = batch.map(entry => embeddingService.formatKnowledgeEntry(entry))
        
        // Calculate tokens and cost
        const batchTokens = texts.reduce((sum, text) => sum + embeddingService.estimateTokens(text), 0)
        const batchCost = embeddingService.calculateCost(batchTokens)
        
        totalTokens += batchTokens
        totalCost += batchCost

        // Generate embeddings
        const embeddings = await embeddingService.generateEmbeddings(texts)

        // Update database with embeddings
        for (let j = 0; j < batch.length; j++) {
          const entry = batch[j]
          const embedding = embeddings[j]

          const { error: updateError } = await supabase
            .from('knowledge_base')
            .update({ embedding })
            .eq('id', entry.id)

          if (updateError) {
            console.error(`Error updating entry ${entry.id}:`, updateError)
          } else {
            processed++
            console.log(`✅ Generated embedding for: ${entry.category} - ${entry.title}`)
          }
        }

        // Small delay to respect rate limits
        if (i + batchSize < entries.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

      } catch (error) {
        console.error(`Error processing batch starting at index ${i}:`, error)
      }
    }

    console.log(`🎉 Embedding generation complete!`)
    console.log(`📈 Processed: ${processed}/${entries.length} entries`)
    console.log(`🎯 Total tokens: ${totalTokens}`)
    console.log(`💰 Total cost: $${totalCost.toFixed(6)}`)

    return NextResponse.json({
      message: 'Embedding generation completed',
      processed,
      total: entries.length,
      tokens: totalTokens,
      cost: totalCost,
      costFormatted: `$${totalCost.toFixed(6)}`
    })

  } catch (error) {
    console.error('Error in embedding generation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
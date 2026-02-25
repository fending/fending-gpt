import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { OpenAIEmbeddingService } from '@/lib/embeddings/openai'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const forceAll = searchParams.get('force') === 'true'

    // Use service role client to bypass RLS for admin operations
    const supabase = createServiceRoleClient()
    const embeddingService = new OpenAIEmbeddingService()

    console.log(`Starting knowledge base embedding generation (force=${forceAll})...`)

    // Get active knowledge base entries — all if force=true, only missing if not
    let query = supabase
      .from('knowledge_base')
      .select('id, category, title, content, tags')
      .eq('is_active', true)

    if (!forceAll) {
      query = query.is('embedding', null)
    }

    const { data: entries, error: fetchError } = await query

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

          console.log(`🔍 Embedding length: ${embedding.length}, first few values: [${embedding.slice(0, 3).join(', ')}...]`)
          
          // First, verify the row exists
          const { data: existingRow, error: checkError } = await supabase
            .from('knowledge_base')
            .select('id, title')
            .eq('id', entry.id)
            .single()
          
          if (checkError || !existingRow) {
            console.error(`❌ Row ${entry.id} not found:`, checkError)
            continue
          }
          
          console.log(`✅ Row exists: ${existingRow.id} - ${existingRow.title}`)
          
          // First test: Can we update ANY field?
          console.log(`🧪 Testing basic update capability for ${entry.id}`)
          
          const { data: testData, error: testError } = await supabase
            .from('knowledge_base')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', entry.id)
            .select('id, updated_at')

          console.log(`🧪 Basic update test - Error:`, testError, `Data length:`, testData?.length || 0)
          
          if (!testData || testData.length === 0) {
            console.error(`❌ Can't even update basic fields! WHERE clause or permissions issue.`)
            continue
          }
          
          // Now try the vector update
          const vectorString = `[${embedding.join(',')}]`
          console.log(`🔧 Updating ${entry.id} with vector string (${embedding.length} dimensions)`)
          
          const { data: updateData, error: updateError } = await supabase
            .from('knowledge_base')
            .update({ embedding: vectorString })
            .eq('id', entry.id)
            .select('id, embedding')

          console.log(`🔧 Vector update - Error:`, updateError, `Data length:`, updateData?.length || 0)

          if (updateError) {
            console.error(`❌ Update failed for ${entry.id}:`, updateError)
            continue
          }

          if (!updateData || updateData.length === 0) {
            console.error(`❌ No rows updated for ${entry.id} - this suggests the WHERE clause didn't match`)
            
            // Double-check the row still exists with exact same query
            const { data: doubleCheck, error: checkError } = await supabase
              .from('knowledge_base')
              .select('id, title, embedding')
              .eq('id', entry.id)
              .single()
            
            console.log(`🔍 Double-check result:`, doubleCheck)
            console.log(`🔍 Double-check error:`, checkError)
          } else {
            console.log(`✅ Successfully updated ${entry.id}`)
            console.log(`📊 Returned embedding type:`, typeof updateData[0]?.embedding)
            console.log(`📊 Returned embedding value:`, updateData[0]?.embedding)
            
            // Verify the embedding was actually persisted
            const { data: verifyData, error: verifyError } = await supabase
              .from('knowledge_base')
              .select('id, embedding')
              .eq('id', entry.id)
              .single()
            
            if (verifyError) {
              console.error(`🔍 Verification query failed for ${entry.id}:`, verifyError)
            } else {
              console.log(`🔍 Verification - embedding in DB:`, verifyData.embedding ? 'POPULATED ✅' : 'NULL ❌')
              console.log(`🔍 Verification - embedding type:`, typeof verifyData.embedding)
              if (verifyData.embedding) {
                console.log(`🔍 Verification - embedding length:`, Array.isArray(verifyData.embedding) ? verifyData.embedding.length : 'not array')
              }
            }
            
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
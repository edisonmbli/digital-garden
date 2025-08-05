// scripts/test-dev-collection-page.js
import { createClient } from '@sanity/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
})

async function testDevCollectionPage() {
  try {
    console.log('🔍 Testing DevCollection page functionality...\n')

    // 1. Test the exact query used in the DAL
    const query = `*[_type == "devCollection"] | order(orderRank asc, _createdAt desc) {
      _id,
      "name": name,
      "description": description,
      "slug": slug.current,
      "coverImageUrl": coverImage.asset->url,
      isFeatured,
      orderRank,
      "logs": logs[]->{
        _id,
        title,
        "slug": slug.current,
        publishedAt,
        excerpt,
        language
      }[language == "en" && defined(slug.current)] | order(publishedAt desc)
    }`

    const collections = await client.fetch(query)

    console.log(`📊 Found ${collections.length} DevCollections:`)
    console.log('=' .repeat(80))
    
    collections.forEach((collection, index) => {
      const name = collection.name?.en || collection.name?.zh || 'Untitled'
      const logsCount = collection.logs?.length || 0
      
      console.log(`${index + 1}. ${name}`)
      console.log(`   Order Rank: ${collection.orderRank ?? 'Not set'}`)
      console.log(`   Featured: ${collection.isFeatured ? 'Yes' : 'No'}`)
      console.log(`   Articles: ${logsCount}`)
      console.log(`   Slug: ${collection.slug}`)
      
      if (collection.logs && collection.logs.length > 0) {
        console.log(`   Latest articles:`)
        collection.logs.slice(0, 3).forEach((log) => {
          console.log(`     - ${log.title} (${log.slug})`)
        })
      }
      console.log('')
    })

    // 2. Check for potential issues
    console.log('\n🔍 Checking for potential issues...')
    
    const collectionsWithoutOrderRank = collections.filter(c => c.orderRank === null || c.orderRank === undefined)
    if (collectionsWithoutOrderRank.length > 0) {
      console.log(`⚠️  ${collectionsWithoutOrderRank.length} collections without orderRank:`)
      collectionsWithoutOrderRank.forEach(c => {
        const name = c.name?.en || c.name?.zh || 'Untitled'
        console.log(`   - ${name}`)
      })
      console.log('\n💡 Consider setting orderRank values in Sanity Studio for better control.')
    } else {
      console.log('✅ All collections have orderRank values!')
    }

    const collectionsWithoutLogs = collections.filter(c => !c.logs || c.logs.length === 0)
    if (collectionsWithoutLogs.length > 0) {
      console.log(`\n📝 ${collectionsWithoutLogs.length} collections without articles:`)
      collectionsWithoutLogs.forEach(c => {
        const name = c.name?.en || c.name?.zh || 'Untitled'
        console.log(`   - ${name}`)
      })
    }

    // 3. Test routing paths
    console.log('\n🔗 Testing routing paths...')
    collections.forEach(collection => {
      if (collection.logs && collection.logs.length > 0) {
        const name = collection.name?.en || collection.name?.zh || 'Untitled'
        console.log(`\n📁 ${name}:`)
        collection.logs.slice(0, 2).forEach(log => {
          console.log(`   Article: ${log.title}`)
          console.log(`   Route: /en/log/${log.slug}`)
          console.log(`   Route: /zh/log/${log.slug}`)
        })
      }
    })

    console.log('\n✅ Test completed successfully!')

  } catch (error) {
    console.error('❌ Error testing DevCollection page:', error)
  }
}

testDevCollectionPage()
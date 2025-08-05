// scripts/test-collection-sorting.js
import { createClient } from '@sanity/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'development',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
})

async function testCollectionSorting() {
  try {
    console.log('🔍 Testing DevCollection sorting functionality...\n')

    // 1. Fetch all devCollections with sortOrder
    const collections = await client.fetch(`
      *[_type == "devCollection"] | order(sortOrder asc, _createdAt desc) {
        _id,
        "name": name,
        "slug": slug.current,
        sortOrder,
        isFeatured,
        "logsCount": count(logs)
      }
    `)

    console.log(`📊 Found ${collections.length} DevCollections:`)
    console.log('=' .repeat(80))
    
    collections.forEach((collection, index) => {
      const name = collection.name?.en || collection.name?.zh || 'Untitled'
      const sortOrder = collection.sortOrder ?? 'undefined'
      const featured = collection.isFeatured ? '⭐' : '  '
      
      console.log(`${index + 1}. ${featured} ${name}`)
      console.log(`   Slug: ${collection.slug}`)
      console.log(`   Sort Order: ${sortOrder}`)
      console.log(`   Logs Count: ${collection.logsCount}`)
      console.log('')
    })

    // 2. Check if any collections need sortOrder values
    const collectionsWithoutSort = collections.filter(c => c.sortOrder === null || c.sortOrder === undefined)
    
    if (collectionsWithoutSort.length > 0) {
      console.log('⚠️  Collections without sortOrder values:')
      collectionsWithoutSort.forEach(c => {
        const name = c.name?.en || c.name?.zh || 'Untitled'
        console.log(`   - ${name} (${c.slug})`)
      })
      console.log('\n💡 Consider setting sortOrder values in Sanity Studio for better control.')
    } else {
      console.log('✅ All collections have sortOrder values!')
    }

    // 3. Test the DAL function
    console.log('\n🧪 Testing DAL function...')
    
    // Import and test the DAL function
    const { getAllDevCollectionsAndLogs } = await import('../lib/dal.ts')
    const dalResult = await getAllDevCollectionsAndLogs('en')
    
    console.log(`📋 DAL returned ${dalResult.length} collections`)
    
    if (dalResult.length > 0) {
      console.log('First collection from DAL:')
      const first = dalResult[0]
      console.log(`   Name: ${first.name?.en || first.name?.zh}`)
      console.log(`   Sort Order: ${first.sortOrder}`)
      console.log(`   Logs: ${first.logs?.length || 0}`)
    }

    console.log('\n✅ Collection sorting test completed!')

  } catch (error) {
    console.error('❌ Error testing collection sorting:', error)
  }
}

// Run the test
testCollectionSorting()
// 测试当前 Sanity collection 的数据结构
import { createClient } from '@sanity/client'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
})

async function testCollectionData() {
  try {
    console.log('🔍 测试 Sanity Collection 数据结构...\n')
    
    // 1. 获取所有 collection 的基本信息
    const collections = await client.fetch(`
      *[_type == "collection"] {
        _id,
        name,
        slug,
        description,
        language,
        "photoCount": count(photos)
      }
    `)
    
    console.log('📋 所有 Collections:')
    console.log(JSON.stringify(collections, null, 2))
    console.log('\n')
    
    // 2. 获取第一个 collection 的详细信息，包括 photos
    if (collections.length > 0) {
      const firstCollection = collections[0]
      const detailedCollection = await client.fetch(`
        *[_type == "collection" && _id == $id][0] {
          _id,
          name,
          slug,
          description,
          language,
          "photos": photos[0...3]-> {
            _id,
            title,
            description,
            "imageUrl": imageFile.asset->url
          }
        }
      `, { id: firstCollection._id })
      
      console.log('📸 第一个 Collection 的详细信息（包含前3张照片）:')
      console.log(JSON.stringify(detailedCollection, null, 2))
      console.log('\n')
    }
    
    // 3. 测试按 slug 查询（模拟当前 DAL 的查询方式）
    const testSlug = 'norway' // 使用一个已知的 slug
    const collectionBySlug = await client.fetch(`
      *[_type == "collection" && slug.current == $slug] {
        _id,
        name,
        slug,
        description,
        language,
        "photos": photos[0...2]-> {
          _id,
          title,
          description,
          "imageUrl": imageFile.asset->url
        }
      }
    `, { slug: testSlug })
    
    console.log(`🔍 按 slug "${testSlug}" 查询的结果:`)
    console.log(JSON.stringify(collectionBySlug, null, 2))
    console.log('\n')
    
    // 4. 检查是否还有 language 字段
    const collectionsWithLanguage = await client.fetch(`
      *[_type == "collection" && defined(language)] {
        _id,
        name,
        language,
        slug
      }
    `)
    
    console.log('🌐 仍有 language 字段的 Collections:')
    console.log(JSON.stringify(collectionsWithLanguage, null, 2))
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

testCollectionData()
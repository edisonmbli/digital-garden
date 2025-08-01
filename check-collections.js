import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCollections() {
  try {
    const collections = await prisma.collection.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📊 Collection表中共有 ${collections.length} 条记录:`)
    collections.forEach((collection, index) => {
      console.log(`${index + 1}. ID: ${collection.id}`)
      console.log(`   Sanity ID: ${collection.sanityId}`)
      console.log(`   名称 (EN): ${collection.nameEn}`)
      console.log(`   名称 (ZH): ${collection.nameZh}`)
      console.log(`   Slug: ${collection.slug}`)
      console.log(`   描述 (EN): ${collection.descriptionEn}`)
      console.log(`   描述 (ZH): ${collection.descriptionZh}`)
      console.log(`   是否精选: ${collection.isFeatured}`)
      console.log(`   创建时间: ${collection.createdAt}`)
      console.log(`   更新时间: ${collection.updatedAt}`)
      console.log('   ---')
    })
  } catch (error) {
    console.error('❌ 检查Collection数据时出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCollections()

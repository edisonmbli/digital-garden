#!/usr/bin/env node

// 验证国际化数据同步结果
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyI18nData() {
  console.log('🔍 验证国际化数据同步结果\n')

  try {
    // 1. 检查 Collection 数据
    console.log('📋 Collection 数据:')
    const collections = await prisma.collection.findMany({
      orderBy: { createdAt: 'asc' },
    })
    
    collections.forEach(collection => {
      console.log(`  - ID: ${collection.id}`)
      console.log(`    sanityId: ${collection.sanityId}`)
      console.log(`    nameEn: ${collection.nameEn}`)
      console.log(`    nameZh: ${collection.nameZh}`)
      console.log(`    slug: ${collection.slug}`)
      console.log(`    isFeatured: ${collection.isFeatured}`)
      console.log('')
    })

    // 2. 检查 Post 和 Log 数据
    console.log('📝 Post 和 Log 数据:')
    const posts = await prisma.post.findMany({
      where: { contentType: 'log' },
      include: {
        logs: {
          orderBy: { language: 'asc' },
        },
      },
      orderBy: { sanityDocumentId: 'asc' },
    })

    posts.forEach(post => {
      console.log(`  Post ID: ${post.id}`)
      console.log(`    sanityDocumentId: ${post.sanityDocumentId}`)
      console.log(`    contentType: ${post.contentType}`)
      console.log(`    关联的 Log 记录:`)
      
      post.logs.forEach(log => {
        console.log(`      - Log ID: ${log.id}`)
        console.log(`        language: ${log.language}`)
        console.log(`        title: ${log.title}`)
        console.log(`        slug: ${log.slug}`)
      })
      console.log('')
    })

    // 3. 检查 Photo 数据
    console.log('📸 Photo 数据:')
    const photoPosts = await prisma.post.findMany({
      where: { contentType: 'photo' },
      include: {
        photo: true,
      },
    })

    photoPosts.forEach(post => {
      console.log(`  Post ID: ${post.id}`)
      console.log(`    sanityDocumentId: ${post.sanityDocumentId}`)
      console.log(`    contentType: ${post.contentType}`)
      if (post.photo) {
        console.log(`    Photo ID: ${post.photo.id}`)
        console.log(`    sanityAssetId: ${post.photo.sanityAssetId}`)
      }
      console.log('')
    })

    // 4. 统计信息
    console.log('📊 统计信息:')
    const collectionCount = await prisma.collection.count()
    const postCount = await prisma.post.count()
    const logCount = await prisma.log.count()
    const photoCount = await prisma.photo.count()

    console.log(`  - Collection 记录数: ${collectionCount}`)
    console.log(`  - Post 记录数: ${postCount}`)
    console.log(`  - Log 记录数: ${logCount}`)
    console.log(`  - Photo 记录数: ${photoCount}`)

    // 5. 验证国际化关系
    console.log('\n🔗 国际化关系验证:')
    
    // 检查 Collection 的字段级别国际化
    console.log('  Collection 字段级别国际化:')
    collections.forEach(collection => {
      const hasEn = collection.nameEn && collection.nameEn.trim() !== ''
      const hasZh = collection.nameZh && collection.nameZh.trim() !== ''
      console.log(`    - ${collection.sanityId}: EN(${hasEn ? '✓' : '✗'}) ZH(${hasZh ? '✓' : '✗'})`)
      if (hasEn) console.log(`      EN: ${collection.nameEn}`)
      if (hasZh) console.log(`      ZH: ${collection.nameZh}`)
    })

    // 检查 Log 的国际化关系
    console.log('\n  Log 国际化组:')
    for (const post of posts) {
      if (post.logs.length > 1) {
        console.log(`    - sanityDocumentId: ${post.sanityDocumentId} (${post.logs.length} 个语言版本)`)
        post.logs.forEach(log => {
          console.log(`      ${log.language}: ${log.title}`)
        })
      }
    }

  } catch (error) {
    console.error('❌ 验证失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyI18nData()
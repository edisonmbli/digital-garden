#!/usr/bin/env node

/**
 * 清理测试数据脚本
 * 删除所有以 'test-' 开头的测试记录
 */

import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: '.env.local' })
const prisma = new PrismaClient()

async function cleanupTestData() {
  console.log('🧹 开始清理测试数据...')

  try {
    // 删除测试 Collection
    const deletedCollections = await prisma.collection.deleteMany({
      where: { sanityId: { startsWith: 'test-' } },
    })
    console.log(`📚 删除了 ${deletedCollections.count} 个测试 Collection`)

    // 删除测试 Post
    const deletedPosts = await prisma.post.deleteMany({
      where: { sanityDocumentId: { startsWith: 'test-' } },
    })
    console.log(`📝 删除了 ${deletedPosts.count} 个测试 Post`)

    // 删除测试 WebhookCall
    const deletedWebhookCalls = await prisma.webhookCall.deleteMany({
      where: { documentId: { startsWith: 'test-' } },
    })
    console.log(`📊 删除了 ${deletedWebhookCalls.count} 个测试 WebhookCall`)

    console.log('✅ 测试数据清理完成！')
  } catch (error) {
    console.error('❌ 清理测试数据时出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupTestData()

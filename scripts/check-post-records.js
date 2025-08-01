// 检查 Prisma 数据库中的 Post 记录
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkPostRecords() {
  try {
    console.log('🔍 检查 Prisma 数据库中的 Post 记录...\n')
    
    // 1. 统计所有 Post 记录
    const totalPosts = await prisma.post.count()
    console.log(`📊 总 Post 记录数: ${totalPosts}`)
    
    // 2. 按 contentType 分组统计
    const postsByType = await prisma.post.groupBy({
      by: ['contentType'],
      _count: {
        id: true
      }
    })
    console.log('📊 按类型分组的 Post 记录:')
    postsByType.forEach(group => {
      console.log(`  - ${group.contentType}: ${group._count.id} 条`)
    })
    
    // 3. 查看前几条 photo 类型的记录
    const photosPosts = await prisma.post.findMany({
      where: {
        contentType: 'photo',
        isDeleted: false
      },
      select: {
        id: true,
        sanityDocumentId: true,
        createdAt: true,
        authorId: true
      },
      take: 10
    })
    
    console.log('\n📸 前10条 photo 类型的 Post 记录:')
    photosPosts.forEach((post, index) => {
      console.log(`  ${index + 1}. ID: ${post.id}`)
      console.log(`     Sanity Document ID: ${post.sanityDocumentId}`)
      console.log(`     Created: ${post.createdAt}`)
      console.log(`     Author: ${post.authorId}`)
      console.log('')
    })
    
    // 4. 检查是否有软删除的记录
    const deletedPosts = await prisma.post.count({
      where: {
        isDeleted: true
      }
    })
    console.log(`🗑️ 软删除的 Post 记录数: ${deletedPosts}`)
    
  } catch (error) {
    console.error('❌ 检查失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPostRecords()
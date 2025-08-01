import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkWebhookCalls() {
  try {
    const calls = await prisma.webhookCall.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    
    console.log(`📊 最近的 ${calls.length} 次webhook调用:`)
    calls.forEach((call, index) => {
      console.log(`${index + 1}. 操作: ${call.operation}`)
      console.log(`   文档类型: ${call.documentType}`)
      console.log(`   文档ID: ${call.documentId}`)
      console.log(`   成功: ${call.success}`)
      console.log(`   错误: ${call.error || '无'}`)
      console.log(`   时间: ${call.createdAt}`)
      console.log('   ---')
    })
  } catch (error) {
    console.error('❌ 检查webhook调用记录时出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkWebhookCalls()

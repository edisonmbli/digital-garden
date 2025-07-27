#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🚀 Webhook 功能启用脚本')
console.log('================================\n')

function enableWebhookFeatures() {
  console.log('🔧 开始启用 Webhook 功能...')
  
  const webhookFilePath = path.join(
    process.cwd(),
    'app/api/webhooks/sanity-sync/route.ts'
  )
  
  if (!fs.existsSync(webhookFilePath)) {
    console.error('❌ Webhook 文件不存在:', webhookFilePath)
    return false
  }
  
  let content = fs.readFileSync(webhookFilePath, 'utf8')
  
  // 启用 WebhookCall 相关功能
  console.log('📝 启用 Webhook 调用记录功能...')
  
  // 启用 checkRateLimit 中的代码
  content = content.replace(
    /\/\/ const recentCalls = await prisma\.webhookCall\.count\(\{[\s\S]*?\/\/ \}\)/g,
    `const recentCalls = await prisma.webhookCall.count({
      where: {
        createdAt: {
          gte: oneHourAgo
        }
      }
    })`
  )
  
  content = content.replace(
    /\/\/ console\.log\(`📊 Recent webhook calls: \$\{recentCalls\}`\)/g,
    `console.log(\`📊 Recent webhook calls: \${recentCalls}\`)`
  )
  
  content = content.replace(
    /\/\/ return recentCalls < rateLimit/g,
    `return recentCalls < rateLimit`
  )
  
  // 启用 recordWebhookCall 中的代码
  content = content.replace(
    /\/\/ await prisma\.webhookCall\.create\(\{[\s\S]*?\/\/ \}\)/g,
    `await prisma.webhookCall.create({
      data: {
        operation,
        documentType,
        documentId,
        success,
        error
      }
    })`
  )
  
  // 启用软删除功能
  console.log('📝 启用软删除功能...')
  
  // Collection 软删除
  content = content.replace(
    /\/\/ const updated = await prisma\.collection\.updateMany\(\{[\s\S]*?\/\/ \}\)/g,
    `const updated = await prisma.collection.updateMany({
      where: {
        sanityId: payload._id
      },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    })`
  )
  
  // Post 软删除 (Log)
  content = content.replace(
    /\/\/ const updated = await prisma\.post\.updateMany\(\{[\s\S]*?\/\/ \}\)/g,
    `const updated = await prisma.post.updateMany({
      where: {
        sanityDocumentId: documentId
      },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    })`
  )
  
  // 更新日志输出以使用 updated.count
  content = content.replace(
    /console\.log\(`✅ Soft deleted collection\(s\) for document: \$\{payload\._id\}`\)/g,
    `console.log(\`✅ Soft deleted \${updated.count} collection(s)\`)`
  )
  
  content = content.replace(
    /console\.log\(`✅ Soft deleted log post\(s\) for document: \$\{documentId\}`\)/g,
    `console.log(\`✅ Soft deleted \${updated.count} log post(s) for document: \${documentId}\`)`
  )
  
  content = content.replace(
    /console\.log\(`✅ Soft deleted photo post\(s\) for document: \$\{documentId\}`\)/g,
    `console.log(\`✅ Soft deleted \${updated.count} photo post(s) for document: \${documentId}\`)`
  )
  
  // 启用 oneHourAgo 和 rateLimit 变量
  content = content.replace(
    /\/\/ const oneHourAgo = new Date\(Date\.now\(\) - 60 \* 60 \* 1000\)/g,
    `const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)`
  )
  
  content = content.replace(
    /\/\/ const rateLimit = 100 \/\/ Max 100 calls per hour/g,
    `const rateLimit = parseInt(process.env.WEBHOOK_RATE_LIMIT_PER_HOUR || '200')`
  )
  
  // 移除临时的 "Temporarily allow all requests" 注释
  content = content.replace(
    /return true \/\/ Temporarily allow all requests/g,
    `return recentCalls < rateLimit`
  )
  
  fs.writeFileSync(webhookFilePath, content)
  console.log('✅ Webhook 文件更新完成')
  
  return true
}

function enableDALFeatures() {
  console.log('📝 启用 DAL 文件中的软删除过滤...')
  
  const dalFilePath = path.join(process.cwd(), 'lib/dal.ts')
  
  if (!fs.existsSync(dalFilePath)) {
    console.warn('⚠️  DAL 文件不存在，跳过更新')
    return true
  }
  
  let content = fs.readFileSync(dalFilePath, 'utf8')
  
  // 启用 isDeleted: false 过滤条件
  content = content.replace(
    /\/\/ TODO: 添加 isDeleted: false 过滤条件/g,
    `isDeleted: false,`
  )
  
  fs.writeFileSync(dalFilePath, content)
  console.log('✅ DAL 文件更新完成')
  
  return true
}

// 主执行流程
function main() {
  try {
    console.log('🔧 开始启用 Webhook 功能...')
    
    if (!enableWebhookFeatures()) {
      console.error('❌ 启用 Webhook 功能失败')
      process.exit(1)
    }
    
    if (!enableDALFeatures()) {
      console.error('❌ 启用 DAL 功能失败')
      process.exit(1)
    }
    
    console.log('\n🎉 所有功能已启用！')
    console.log('\n📋 后续步骤：')
    console.log('1. 运行 `pnpm prisma generate` 确保类型最新')
    console.log('2. 运行 `pnpm build` 检查是否有类型错误')
    console.log('3. 测试 webhook 功能是否正常工作')
    
  } catch (error) {
    console.error('❌ 脚本执行失败:', error.message)
    process.exit(1)
  }
}

main()
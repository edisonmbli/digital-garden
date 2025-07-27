#!/usr/bin/env node

/**
 * 测试 Sanity Webhook 删除功能的脚本
 * 用于验证软删除逻辑是否正常工作
 */

import crypto from 'crypto'

// 模拟删除 webhook payload
const deletePayloads = {
  collectionDelete: {
    operation: 'delete',
    beforeState: {
      _id: 'test-collection-id-123',
      _type: 'collection',
      name: 'Test Collection',
      language: 'en'
    },
    afterState: null
  },
  
  logDelete: {
    operation: 'delete',
    beforeState: {
      _id: 'test-log-id-456',
      _type: 'log',
      title: 'Test Log Entry',
      language: 'en'
    },
    afterState: null
  },
  
  photoDelete: {
    operation: 'delete',
    beforeState: {
      _id: 'test-photo-id-789',
      _type: 'photo',
      sanityAssetId: 'image-test-asset-id'
    },
    afterState: null
  }
}

// 生成签名
function generateSignature(body, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64')
}

// 发送测试请求
async function sendTestWebhook(payloadName, payload) {
  const webhookSecret = process.env.SANITY_WEBHOOK_SECRET || 'af2c5287cd86db9ba0e8a6b35fe6a264bdec8cda218eabfa97083b830eeaa6bc'
  const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/sanity-sync'
  
  const body = JSON.stringify(payload)
  const signature = generateSignature(body, webhookSecret)
  
  console.log(`\n🧪 Testing ${payloadName}...`)
  console.log(`📤 Sending to: ${webhookUrl}`)
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'sanity-webhook-signature': signature
      },
      body
    })
    
    const responseText = await response.text()
    
    console.log(`📊 Status: ${response.status}`)
    console.log(`📋 Response:`, responseText)
    
    if (response.ok) {
      console.log(`✅ ${payloadName} test passed!`)
    } else {
      console.log(`❌ ${payloadName} test failed!`)
    }
  } catch (error) {
    console.error(`💥 ${payloadName} test error:`, error.message)
  }
}

// 主函数
async function main() {
  console.log('🗑️ Starting Sanity Webhook Delete Tests...')
  
  // 检查环境变量
  if (!process.env.SANITY_WEBHOOK_SECRET) {
    console.log('⚠️  SANITY_WEBHOOK_SECRET not set, using default test secret')
  }
  
  // 运行所有删除测试
  for (const [name, payload] of Object.entries(deletePayloads)) {
    await sendTestWebhook(name, payload)
    // 等待一秒避免触发限流
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('\n🏁 All delete tests completed!')
}

// 运行测试
main().catch(console.error)

export { deletePayloads, generateSignature, sendTestWebhook }
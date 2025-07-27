#!/usr/bin/env node

/**
 * 测试 Sanity Webhook 的脚本
 * 用于验证 webhook 处理逻辑是否正常工作
 */

import crypto from 'crypto'

// 模拟 webhook payload
const testPayloads = {
  collectionCreate: {
    operation: 'create',
    beforeState: null,
    afterState: {
      _id: 'test-collection-id-123',
      _type: 'collection',
      _createdAt: '2025-01-27T06:44:05Z',
      _updatedAt: '2025-01-27T06:44:05Z',
      _rev: 'test-rev-123',
      name: 'Test Collection',
      description: 'This is a test collection',
      slug: { _type: 'slug', current: 'test-collection' },
      language: 'en',
      isFeatured: false
    }
  },
  
  logCreate: {
    operation: 'create',
    beforeState: null,
    afterState: {
      _id: 'test-log-id-456',
      _type: 'log',
      _createdAt: '2025-01-27T06:44:05Z',
      _updatedAt: '2025-01-27T06:44:05Z',
      _rev: 'test-rev-456',
      title: 'Test Log Entry',
      excerpt: 'This is a test log entry',
      slug: { _type: 'slug', current: 'test-log-entry' },
      language: 'en',
      publishedAt: '2025-01-27T06:44:05Z',
      tags: ['test', 'webhook']
    }
  },
  
  photoCreate: {
    operation: 'create',
    beforeState: null,
    afterState: {
      _id: 'test-photo-id-789',
      _type: 'photo',
      _createdAt: '2025-01-27T06:44:05Z',
      _updatedAt: '2025-01-27T06:44:05Z',
      _rev: 'test-rev-789',
      sanityAssetId: 'image-test-asset-id',
      titleJson: JSON.stringify({ en: 'Test Photo', zh: '测试照片' }),
      descriptionJson: JSON.stringify({ en: 'A test photo', zh: '一张测试照片' })
    }
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
  console.log(`📝 Payload:`, JSON.stringify(payload, null, 2))
  
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
  console.log('🚀 Starting Sanity Webhook Tests...')
  
  // 检查环境变量
  if (!process.env.SANITY_WEBHOOK_SECRET) {
    console.log('⚠️  SANITY_WEBHOOK_SECRET not set, using default test secret')
  }
  
  // 运行所有测试
  for (const [name, payload] of Object.entries(testPayloads)) {
    await sendTestWebhook(name, payload)
    // 等待一秒避免触发限流
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('\n🏁 All tests completed!')
}

// 运行测试
main().catch(console.error)

export { testPayloads, generateSignature, sendTestWebhook }
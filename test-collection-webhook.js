import fetch from 'node-fetch'

// 模拟Sanity发送的webhook payload
const testPayload = {
  operation: 'update',
  beforeState: null,
  afterState: {
    _id: 'e6162640-a33a-4dd4-b558-6be996a627ba',
    _type: 'collection',
    _createdAt: '2025-07-21T12:37:26Z',
    _updatedAt: '2025-08-01T06:25:35Z',
    name: {
      en: 'Japan',
      zh: '日本'
    },
    description: {
      en: 'Traveling in Japan, the joy of walking through the streets',
      zh: '日本自由行，背着小相机，穿街走巷的快乐'
    },
    slug: {
      _type: 'slug',
      current: 'japan'
    },
    isFeatured: true
  }
}

async function testWebhook() {
  try {
    console.log('🧪 测试Collection webhook...')
    
    const response = await fetch('http://localhost:3001/api/webhooks/sanity-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'sanity-webhook-signature': 'test-signature' // 这里需要实际的签名，但我们先测试
      },
      body: JSON.stringify(testPayload)
    })
    
    const result = await response.text()
    console.log('📊 响应状态:', response.status)
    console.log('📊 响应内容:', result)
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

testWebhook()

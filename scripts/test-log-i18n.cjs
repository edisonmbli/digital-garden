// 使用内置的 fetch API (Node.js 18+)
const crypto = require('crypto');

const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/sanity-sync';
const WEBHOOK_SECRET = process.env.SANITY_WEBHOOK_SECRET || 'af2c5287cd86db9ba0e8a6b35fe6a264bdec8cda218eabfa97083b830eeaa6bc';

// 生成 Webhook 签名
function generateSignature(body, secret) {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

// 模拟首条 log 创建（英文版本）
const firstLogPayload = {
  _type: 'log',
  _id: 'shared-log-en',
  _rev: 'v1',
  title: 'Test Log Entry',
  slug: { current: 'test-log-entry-en' },
  excerpt: 'This is a test log entry',
  publishedAt: new Date().toISOString(),
  tags: ['test', 'log'],
  language: 'en'
};

// 模拟第二条 log 创建（中文版本）
// 在真实场景中，这会是同一内容的中文翻译版本
const secondLogPayload = {
  _type: 'log',
  _id: 'shared-log-zh',
  _rev: 'v1',
  title: '测试日志条目',
  slug: { current: 'test-log-entry-zh' },
  excerpt: '这是一个测试日志条目',
  publishedAt: new Date().toISOString(),
  tags: ['测试', '日志'],
  language: 'zh'
};

async function testLogI18nHandling() {
  console.log('🧪 开始测试 Log 国际化处理逻辑...\n');

  try {
    // 1. 创建首条 log (英文版本)
    console.log('1️⃣ 创建首条 log (英文)...');
    
    const firstPayload = {
      operation: 'create',
      beforeState: null,
      afterState: firstLogPayload
    };
    
    const firstBody = JSON.stringify(firstPayload);
    const firstSignature = generateSignature(firstBody, WEBHOOK_SECRET);
    
    const firstResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'sanity-webhook-signature': firstSignature
      },
      body: firstBody
    });

    if (firstResponse.ok) {
      console.log('✅ 首条 log 创建成功');
    } else {
      console.log('❌ 首条 log 创建失败:', await firstResponse.text());
      return;
    }

    // 等待一秒，确保第一个请求完全处理完毕
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. 创建第二条 log (中文版本)
    console.log('\n2️⃣ 创建第二条 log (中文)...');
    
    const secondPayload = {
      operation: 'create',
      beforeState: null,
      afterState: secondLogPayload
    };
    
    const secondBody = JSON.stringify(secondPayload);
    const secondSignature = generateSignature(secondBody, WEBHOOK_SECRET);
    
    const secondResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'sanity-webhook-signature': secondSignature
      },
      body: secondBody
    });

    if (secondResponse.ok) {
      console.log('✅ 第二条 log 创建成功');
    } else {
      console.log('❌ 第二条 log 创建失败:', await secondResponse.text());
      return;
    }

    console.log('\n🎉 Log 国际化处理测试完成！');
    console.log('📝 请检查数据库中的 Post 和 Log 表，确认：');
    console.log('   - Post 表中只有一条记录，sanityDocumentId 为 "shared-log-en"（第一个创建的文档ID）');
    console.log('   - Log 表中有两条记录，都指向同一个 postId，分别是英文和中文版本');

  } catch (error) {
    console.log('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
testLogI18nHandling();
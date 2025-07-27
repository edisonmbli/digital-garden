require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyLogI18nData() {
  console.log('🔍 验证 Log 国际化数据...\n');

  try {
    // 1. 检查 Post 表
    console.log('1️⃣ 检查 Post 表...');
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { sanityDocumentId: 'shared-log-en' },
          { sanityDocumentId: 'shared-log-zh' },
          { sanityDocumentId: 'shared-log-base' }
        ]
      },
      include: {
        logs: true
      }
    });

    console.log(`📊 找到 ${posts.length} 条 Post 记录:`);
    posts.forEach((post, index) => {
      console.log(`   ${index + 1}. ID: ${post.id}, sanityDocumentId: ${post.sanityDocumentId}`);
      console.log(`      关联的 Log 记录数: ${post.logs.length}`);
    });

    // 2. 检查 Log 表
    console.log('\n2️⃣ 检查 Log 表...');
    const logs = await prisma.log.findMany({
      where: {
        OR: [
          { title: 'Test Log Entry' },
          { title: '测试日志条目' }
        ]
      },
      orderBy: { id: 'asc' }
    });

    console.log(`📊 找到 ${logs.length} 条 Log 记录:`);
    logs.forEach((log, index) => {
      console.log(`   ${index + 1}. ID: ${log.id}, postId: ${log.postId}, language: ${log.language}`);
      console.log(`      title: ${log.title}`);
    });

    // 3. 验证数据一致性
    console.log('\n3️⃣ 验证数据一致性...');
    
    // 检查是否只有一个 Post 记录
    if (posts.length !== 1) {
      console.log('❌ Post 表数据错误：应该只有1条记录，实际有', posts.length, '条');
    } else {
      console.log('✅ Post 表数据正确：只有1条记录');
      
      const post = posts[0];
      const relatedLogs = logs.filter(l => l.postId === post.id);
      
      if (relatedLogs.length !== 2) {
        console.log('❌ Log 表数据错误：应该有2条记录指向同一个 postId，实际有', relatedLogs.length, '条');
      } else {
        const languages = relatedLogs.map(l => l.language).sort();
        if (languages.join(',') === 'en,zh') {
          console.log('✅ Log 表数据正确：找到英文和中文两条记录指向同一个 postId');
        } else {
          console.log('❌ Log 表语言错误：应该是 en,zh，实际是', languages.join(','));
        }
      }
    }

    // 4. 检查 WebhookCall 记录
    console.log('\n4️⃣ 检查最近的 WebhookCall 记录...');
    const recentWebhookCalls = await prisma.webhookCall.findMany({
      where: {
        documentType: 'log',
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // 最近5分钟
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log(`📊 找到 ${recentWebhookCalls.length} 条最近的 WebhookCall 记录:`);
    recentWebhookCalls.forEach((call, index) => {
      console.log(`   ${index + 1}. ${call.operation} - ${call.documentId} - success: ${call.success}`);
    });

    console.log('\n🎉 数据验证完成！');

  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行验证
verifyLogI18nData();
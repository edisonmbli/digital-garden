// 简单的Collection数据回填脚本
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createSampleCollections() {
  console.log('🚀 开始创建示例Collection数据...')

  try {
    // 创建示例Collection
    const collection1 = await prisma.collection.upsert({
      where: { sanityId: 'sample-collection-1' },
      update: {},
      create: {
        sanityId: 'sample-collection-1',
        nameEn: 'Lake Reflections',
        nameZh: '湖边的女人',
        slug: 'lake-reflections',
        descriptionEn: 'A peaceful moment by the lake',
        descriptionZh: '湖边宁静的时光',
        isFeatured: true,
      },
    })

    console.log('✅ 创建Collection:', collection1.nameEn)

    // 创建系统用户（如果不存在）
    const systemUser = await prisma.user.upsert({
      where: { email: 'system@example.com' },
      update: {},
      create: {
        id: 'system-user',
        email: 'system@example.com',
        name: 'System User',
      },
    })

    console.log('✅ 系统用户已准备:', systemUser.name)

    console.log('🎉 数据回填完成！')
  } catch (error) {
    console.error('💥 数据回填失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行脚本
if (require.main === module) {
  createSampleCollections()
}

/**
 * Sanity 数据回填脚本
 * 
 * 将 Sanity CMS 中的 Collections 和 Photos 数据回填到 Postgres 数据库
 * 通过本地应用的 API 路由访问 Sanity 数据，避免直接网络连接问题
 */

import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()
const API_BASE = 'http://localhost:3000/api/sanity-data'

// HTTP 请求函数
async function fetchFromAPI(type) {
  console.log(`   🔄 通过 API 获取${type}数据...`)

  try {
    const response = await fetch(`${API_BASE}?type=${type}`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    console.log(`   ✅ ${type}数据获取成功`)
    return result
  } catch (error) {
    console.log(`   ❌ ${type}数据获取失败: ${error.message}`)
    throw error
  }
}

// 获取或创建系统用户
async function getOrCreateSystemUser() {
  let systemUser = await prisma.user.findFirst({
    where: { id: 'system-user' },
  })

  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        id: 'system-user',
        email: 'system@example.com',
        name: 'System User',
      },
    })
  }

  return systemUser.id
}

// 回填 Collections
async function backfillCollections() {
  console.log('\n🔄 开始回填 Collections...')

  try {
    // 通过 API 获取 Collections 数据
    const result = await fetchFromAPI('collections')
    const collections = result.data
    console.log(`📊 成功获取 ${collections.length} 个 Collection`)

    let processedCount = 0
    let createdCount = 0
    let updatedCount = 0

    for (const collection of collections) {
      try {
        processedCount++
        console.log(
          `\n🔄 处理 Collection ${processedCount}/${collections.length}: ${
            collection.name || 'Unnamed'
          }`
        )

        const i18nId = collection._i18n_id_ || collection._id
        const language = collection.language || 'en'

        // 检查现有记录
        const existing = await prisma.collection.findFirst({
          where: {
            sanityI18nId: i18nId,
            language: language,
          },
        })

        if (existing) {
          await prisma.collection.update({
            where: { id: existing.id },
            data: {
              name: collection.name,
              slug: collection.slug,
              description: collection.description,
              coverImageUrl: collection.coverImageUrl,
              isFeatured: collection.isFeatured || false,
            },
          })
          updatedCount++
          console.log(`   ✅ 更新成功`)
        } else {
          await prisma.collection.create({
            data: {
              sanityI18nId: i18nId,
              sanityId: collection._id,
              language: language,
              name: collection.name,
              slug: collection.slug,
              description: collection.description,
              coverImageUrl: collection.coverImageUrl,
              isFeatured: collection.isFeatured || false,
            },
          })
          createdCount++
          console.log(`   ✅ 创建成功`)
        }
      } catch (error) {
        console.error(
          `❌ 处理 Collection 失败 ${collection._id}:`,
          error.message
        )
      }
    }

    console.log(`\n📊 Collections 回填完成统计:`)
    console.log(`   📝 总处理数量: ${processedCount}`)
    console.log(`   🆕 新创建: ${createdCount}`)
    console.log(`   📝 更新: ${updatedCount}`)
  } catch (error) {
    console.error('❌ Collections 回填失败:', error.message)
    throw error
  }
}

// 回填 Photos
async function backfillPhotos(systemUserId) {
  console.log('\n🔄 开始回填 Photos...')

  try {
    // 通过 API 获取 Photos 数据
    const result = await fetchFromAPI('photos')
    const photos = result.data
    console.log(`📊 成功获取 ${photos.length} 个 Photo`)

    let processedCount = 0
    let postsCreated = 0
    let photosCreated = 0

    for (const photo of photos) {
      try {
        processedCount++
        console.log(
          `\n🔄 处理 Photo ${processedCount}/${photos.length}: ${photo._id}`
        )

        // 处理 Post
        let post = await prisma.post.findFirst({
          where: { sanityDocumentId: photo._id },
        })

        if (!post) {
          post = await prisma.post.create({
            data: {
              sanityDocumentId: photo._id,
              contentType: 'photo',
              authorId: systemUserId,
            },
          })
          postsCreated++
          console.log(`   ✅ Post 创建成功`)
        }

        // 处理 Photo
        const existingPhoto = await prisma.photo.findFirst({
          where: { postId: post.id },
        })

        if (!existingPhoto) {
          await prisma.photo.create({
            data: {
              postId: post.id,
              sanityAssetId: photo.assetId,
              titleJson: JSON.stringify(photo.title || {}),
              descriptionJson: JSON.stringify(photo.description || {}),
            },
          })
          photosCreated++
          console.log(`   ✅ Photo 创建成功`)
        } else {
          console.log(`   📝 Photo 已存在`)
        }
      } catch (error) {
        console.error(`❌ 处理 Photo 失败 ${photo._id}:`, error.message)
      }
    }

    console.log(`\n📊 Photos 回填完成统计:`)
    console.log(`   📝 总处理数量: ${processedCount}`)
    console.log(`   🆕 Posts 创建: ${postsCreated}`)
    console.log(`   🆕 Photos 创建: ${photosCreated}`)
  } catch (error) {
    console.error('❌ Photos 回填失败:', error.message)
    throw error
  }
}

// 主函数
async function main() {
  const startTime = new Date()
  console.log('🚀 开始 Sanity 数据回填...')
  console.log(`⏰ 开始时间: ${startTime.toLocaleString()}`)

  // 先测试 API 连接
  console.log('\n🧪 测试 API 连接...')
  try {
    const countResult = await fetchFromAPI('count')
    console.log(`✅ API 连接正常`)
    console.log(
      `📊 Sanity 数据统计: Collections: ${countResult.collections}, Photos: ${countResult.photos}`
    )
  } catch (error) {
    console.error('❌ API 连接测试失败，请确保开发服务器正在运行 (pnpm dev)')
    throw error
  }

  try {
    // 获取系统用户
    console.log('\n👤 检查系统用户...')
    const systemUserId = await getOrCreateSystemUser()
    console.log(`👤 系统用户 ID: ${systemUserId}`)

    // 执行回填
    await backfillCollections()
    await backfillPhotos(systemUserId)

    const endTime = new Date()
    const duration = Math.round((endTime - startTime) / 1000)

    console.log('\n🎉 数据回填完成！')
    console.log(`⏰ 结束时间: ${endTime.toLocaleString()}`)
    console.log(`⏱️  总耗时: ${duration} 秒`)
  } catch (error) {
    const endTime = new Date()
    const duration = Math.round((endTime - startTime) / 1000)

    console.error('\n💥 数据回填失败!')
    console.error(`⏰ 失败时间: ${endTime.toLocaleString()}`)
    console.error(`⏱️  运行时长: ${duration} 秒`)
    console.error('❌ 错误详情:', error)

    process.exit(1)
  } finally {
    console.log('\n🔌 断开数据库连接...')
    await prisma.$disconnect()
    console.log('✅ 数据库连接已断开')
  }
}

// 检查是否直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

// scripts/backfill-sanity-data.ts
// 一次性脚本：用于将已存在于 Sanity 中的内容手动回填到 Postgres

const { client } = require('../sanity/client.ts')
const { groq } = require('next-sanity')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const sanityClient = client

// 获取或创建系统用户
async function getOrCreateSystemUser() {
  const systemUser = await prisma.user.findFirst({
    where: { email: 'system@example.com' },
  })

  if (!systemUser) {
    const newSystemUser = await prisma.user.create({
      data: {
        id: 'system-user',
        email: 'system@example.com',
        name: 'System User',
      },
    })
    return newSystemUser.id
  }

  return systemUser.id
}

// 回填 Collections
async function backfillCollections() {
  console.log('开始回填 Collections...')

  const collections = await sanityClient.fetch(`
    *[_type == "collection"] {
      _id,
      name,
      description,
      "slug": slug.current,
      "coverImageUrl": coverImage.asset->url,
      isFeatured
    }
  `)

  for (const collection of collections) {
    try {
      // 处理字段级别国际化的name和description
      const nameEn = collection.name?.en || ''
      const nameZh = collection.name?.zh || ''
      const descriptionEn = collection.description?.en || null
      const descriptionZh = collection.description?.zh || null

      await prisma.collection.upsert({
        where: { sanityId: collection._id },
        update: {
          nameEn,
          nameZh,
          slug: collection.slug || '',
          descriptionEn,
          descriptionZh,
          coverImageUrl: collection.coverImageUrl || null,
          isFeatured: collection.isFeatured || false,
        },
        create: {
          sanityId: collection._id,
          nameEn,
          nameZh,
          slug: collection.slug || '',
          descriptionEn,
          descriptionZh,
          coverImageUrl: collection.coverImageUrl || null,
          isFeatured: collection.isFeatured || false,
        },
      })

      console.log(`✓ Collection ${nameEn || nameZh} synced`)
    } catch (error) {
      console.error(`✗ Failed to sync collection ${collection._id}:`, error)
    }
  }
}

// 回填 Photos
async function backfillPhotos(systemUserId) {
  console.log('开始回填 Photos...')

  const photos = await sanityClient.fetch(`
    *[_type == "photo"] {
      _id,
      "assetId": imageFile.asset._ref,
      title,
      description
    }
  `)

  for (const photo of photos) {
    try {
      await prisma.$transaction(async (tx) => {
        // 1. 创建或更新 Post
        const post = await tx.post.upsert({
          where: { sanityDocumentId: photo._id },
          update: {
            contentType: 'photo',
          },
          create: {
            sanityDocumentId: photo._id,
            contentType: 'photo',
            authorId: systemUserId,
          },
        })

        // 2. 创建或更新 Photo
        await tx.photo.upsert({
          where: { postId: post.id },
          update: {
            sanityAssetId: photo.assetId || null,
            titleJson: JSON.stringify(photo.title || {}),
            descriptionJson: JSON.stringify(photo.description || {}),
          },
          create: {
            postId: post.id,
            sanityAssetId: photo.assetId || null,
            titleJson: JSON.stringify(photo.title || {}),
            descriptionJson: JSON.stringify(photo.description || {}),
          },
        })
      })

      console.log(`✓ Photo ${photo._id} synced`)
    } catch (error) {
      console.error(`✗ Failed to sync photo ${photo._id}:`, error)
    }
  }
}

// 回填 Logs
async function backfillLogs(systemUserId) {
  console.log('开始回填 Logs...')

  const logs = await sanityClient.fetch(`
    *[_type == "log"] {
      _id,
      _i18n_id_,
      _lang,
      title,
      "slug": slug.current,
      excerpt,
      publishedAt,
      tags
    }
  `)

  for (const log of logs) {
    const sanityDocumentId = log._i18n_id_ || log._id
    const language = log._lang || 'en'

    try {
      await prisma.$transaction(async (tx) => {
        // 1. 创建或更新 Post
        const post = await tx.post.upsert({
          where: { sanityDocumentId },
          update: {
            contentType: 'log',
          },
          create: {
            sanityDocumentId,
            contentType: 'log',
            authorId: systemUserId,
          },
        })

        // 2. 创建或更新 Log
        const existingLog = await tx.log.findFirst({
          where: {
            postId: post.id,
            language: language,
          },
        })

        if (existingLog) {
          await tx.log.update({
            where: { id: existingLog.id },
            data: {
              title: log.title || '',
              slug: log.slug || '',
              excerpt: log.excerpt || null,
              publishedAt: log.publishedAt ? new Date(log.publishedAt) : null,
              tags: log.tags || [],
            },
          })
        } else {
          await tx.log.create({
            data: {
              postId: post.id,
              title: log.title || '',
              slug: log.slug || '',
              excerpt: log.excerpt || null,
              publishedAt: log.publishedAt ? new Date(log.publishedAt) : null,
              tags: log.tags || [],
              language,
            },
          })
        }
      })

      console.log(`✓ Log ${log.title} (${language}) synced`)
    } catch (error) {
      console.error(`✗ Failed to sync log ${log._id}:`, error)
    }
  }
}

// 回填 Collection-Photo 关联关系
async function backfillCollectionPhotoRelations(systemUserId) {
  console.log('🔄 开始回填 Collection-Photo 关联关系...')

  const collections = await sanityClient.fetch(
    groq`*[_type == "collection"] {
      _id,
      "photoIds": photos[]._ref
    }`
  )

  for (const collection of collections) {
    if (!collection.photoIds || collection.photoIds.length === 0) continue

    try {
      // 获取 Postgres 中的 collection 记录
      const dbCollection = await prisma.collection.findUnique({
        where: { sanityId: collection._id },
      })

      if (!dbCollection) {
        console.warn(
          `Collection ${collection._id} not found in database, skipping`
        )
        continue
      }

      // 获取对应的 photo posts
      const photoPosts = await prisma.post.findMany({
        where: {
          sanityDocumentId: { in: collection.photoIds },
          contentType: 'photo',
        },
      })

      // 先删除现有关联
      await prisma.postsOnCollections.deleteMany({
        where: { collectionId: dbCollection.id },
      })

      // 创建新关联
      for (const photoPost of photoPosts) {
        await prisma.postsOnCollections.create({
          data: {
            postId: photoPost.id,
            collectionId: dbCollection.id,
            assignedBy: systemUserId,
          },
        })
      }

      console.log(
        `✅ 同步关联关系: Collection ${collection._id} -> ${photoPosts.length} photos`
      )
    } catch (error) {
      console.error(`❌ 同步关联关系失败 ${collection._id}:`, error)
    }
  }
}

// 主函数
async function main() {
  console.log('🚀 开始 Sanity 数据回填...')

  try {
    // 获取系统用户
    const systemUserId = await getOrCreateSystemUser()
    console.log(`👤 系统用户 ID: ${systemUserId}`)

    // 按顺序执行回填
    await backfillCollections()
    await backfillPhotos(systemUserId)
    await backfillLogs(systemUserId)
    await backfillCollectionPhotoRelations(systemUserId)

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
  main()
}
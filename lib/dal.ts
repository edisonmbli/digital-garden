// app/lib/dal.ts
import 'server-only'
import { cache } from 'react'
import { groq } from 'next-sanity'
import { auth } from '@clerk/nextjs/server'
import prisma from './prisma'
import { sanityServerClient } from '@/lib/sanity-server'
import { urlFor } from '@/sanity/image'
import {
  extractSanityImageId,
  generateSecureImageUrl,
} from './secure-image-loader'
import { logger } from './logger'
import { withDatabaseMonitoring } from './sentry-dal-integration'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'
import type { Locale } from '@/i18n-config'
import type {
  DevCollection,
  LogPost,
  Photo,
  GroupAndPhotos,
  LogPostDetails,
  EnrichedPhoto,
  EnrichedLogPost,
  Author,
} from '@/types/sanity'

// --- Sanity Queries ---

// 只获取那些被标记为"精选"的影像组，用于首页
export const getHeroCollections = cache(async () => {
  const query = groq`*[_type == "collection" && isFeatured == true] | order(orderRank) {
    _id,
    "name": name,
    "description": description,
    "slug": slug.current,
    coverImage,
    isFeatured,
    orderRank
  }`

  const collections = await sanityServerClient.fetch(
    query,
    {},
    {
      next: {
        tags: ['collections', 'featured-collections', 'homepage-collections'],
      },
    }
  )

  // 为每个collection生成安全的coverImageUrl（返回安全代理URL）
  return collections.map(
    (collection: {
      coverImage?: SanityImageSource
      [key: string]: unknown
    }) => {
      let imageId: string | null = null

      if (collection.coverImage) {
        if (
          typeof collection.coverImage === 'object' &&
          'asset' in collection.coverImage &&
          collection.coverImage.asset
        ) {
          imageId = collection.coverImage.asset._ref
        } else {
          imageId = extractSanityImageId(urlFor(collection.coverImage).url())
        }
      }

      return {
        ...collection,
        coverImageUrl: imageId ? generateSecureImageUrl(imageId) : null,
      }
    }
  )
})

// 获取所有的影像组（未来支持分页），用于 /gallery 列表页
export const getAllCollections = cache(async () => {
  const query = groq`*[_type == "collection"] | order(orderRank) {
    _id,
    "name": name,
    "description": description,
    "slug": slug.current,
    coverImage,
    isFeatured,
    orderRank
  }`

  const collections = await sanityServerClient.fetch(
    query,
    {},
    {
      next: {
        tags: ['collections', 'gallery-collections'],
      },
    }
  )

  // 为每个collection生成安全的coverImageUrl（返回安全代理URL）
  return collections.map(
    (collection: {
      coverImage?: SanityImageSource
      [key: string]: unknown
    }) => {
      let imageId: string | null = null

      if (collection.coverImage) {
        if (
          typeof collection.coverImage === 'object' &&
          'asset' in collection.coverImage &&
          collection.coverImage.asset
        ) {
          imageId = collection.coverImage.asset._ref
        } else {
          imageId = extractSanityImageId(urlFor(collection.coverImage).url())
        }
      }

      return {
        ...collection,
        coverImageUrl: imageId ? generateSecureImageUrl(imageId) : null,
      }
    }
  )
})

export const getLogPosts = cache(async (lang: Locale) => {
  const query = groq`*[_type == "log" && language == $lang] | order(publishedAt desc) {
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    excerpt
  }`
  return sanityServerClient.fetch<LogPost[]>(
    query,
    { lang },
    {
      next: {
        tags: ['logs', `logs:${lang}`, 'log-list'],
      },
    }
  )
})

export const getLogPostBySlug = cache(async (slug: string, lang: Locale) => {
  const query = groq`*[_type == "log" && slug.current == $slug && language == $lang][0] {
    _id,
    title,
    content, // Portable Text
    publishedAt,
    "author": author->{ name, image }
  }`
  return sanityServerClient.fetch<LogPostDetails>(
    query,
    { slug, lang },
    {
      next: {
        tags: ['logs', `log:${slug}`, `logs:${lang}`, 'log-detail'],
      },
    }
  )
})

// 获取所有开发教程合集（用于列表页）
export const getAllDevCollectionsAndLogs = cache(async (lang: Locale) => {
  const query = groq`*[_type == "devCollection"] | order(orderRank asc, _createdAt desc) {
    _id,
    "name": name,
    "description": description,
    "slug": slug.current,
    coverImage,
    isFeatured,
    orderRank,
    "logs": *[_type == "log" && language == $lang && defined(slug.current) && _id in ^.logs[]._ref] | order(publishedAt asc) {
      _id,
      title,
      "slug": slug.current,
      publishedAt,
      excerpt,
      language
    } [defined(@)],
    "logsCount": count(*[_type == "log" && language == $lang && defined(slug.current) && _id in ^.logs[]._ref])
  }`

  const devCollectionsData = await sanityServerClient.fetch<
    { coverImage?: SanityImageSource; [key: string]: unknown }[]
  >(
    query,
    {
      lang,
    },
    {
      next: {
        tags: [
          'dev-collections',
          `dev-collections:${lang}`,
          'dev-collection-list',
        ],
      },
    }
  )

  // 生成安全的图片URL（返回安全代理URL）
  const devCollections: DevCollection[] = devCollectionsData.map(
    (collection) => {
      let imageId: string | null = null

      if (collection.coverImage) {
        if (
          typeof collection.coverImage === 'object' &&
          'asset' in collection.coverImage &&
          collection.coverImage.asset
        ) {
          imageId = collection.coverImage.asset._ref
        } else {
          imageId = extractSanityImageId(urlFor(collection.coverImage).url())
        }
      }

      return {
        ...collection,
        coverImageUrl: imageId ? generateSecureImageUrl(imageId) : undefined,
      }
    }
  ) as DevCollection[]

  return devCollections
})

// 获取特定合集的详细信息（用于文章详情页的导航）
export const getDevCollectionBySlug = cache(
  async (slug: string, lang: Locale) => {
    const query = groq`*[_type == "devCollection" && slug.current == $slug][0] {
    _id,
    "name": name,
    "description": description,
    "slug": slug.current,
    coverImage,
    isFeatured,
    "logs": *[_type == "log" && language == $lang && defined(slug.current) && _id in ^.logs[]._ref] {
      _id,
      title,
      "slug": slug.current,
      publishedAt,
      excerpt,
      language
    } [defined(@)]
  }`

    const devCollectionData = await sanityServerClient.fetch<{
      coverImage?: SanityImageSource
      [key: string]: unknown
    } | null>(
      query,
      { slug, lang },
      {
        next: {
          tags: [
            'dev-collections',
            `dev-collection:${slug}`,
            `dev-collections:${lang}`,
          ],
        },
      }
    )

    if (!devCollectionData) {
      return null
    }

    return {
      _id: devCollectionData._id,
      name: devCollectionData.name,
      description: devCollectionData.description,
      slug: devCollectionData.slug,
      coverImageUrl: devCollectionData.coverImage
        ? typeof devCollectionData.coverImage === 'object' &&
          'asset' in devCollectionData.coverImage &&
          devCollectionData.coverImage.asset
          ? devCollectionData.coverImage.asset._ref
          : extractSanityImageId(urlFor(devCollectionData.coverImage).url())
        : undefined,
      isFeatured: devCollectionData.isFeatured,
      logs: devCollectionData.logs || [],
    } as DevCollection
  }
)

// 根据当前文档的 slug 和 lang，获取其所有翻译版本的 slug
export const getTranslationsBySlug = cache(
  async ({
    slug,
    lang,
    type,
  }: {
    slug: string
    lang: Locale
    type: string
  }) => {
    const query = groq`
      *[_type == $type && slug.current == $slug && language == $lang][0] {
        _id,
        slug,
        language,
        // 获取所有翻译版本
        "_translations": *[_type == "translation.metadata" && references(^._id)].translations[].value-> {
          slug,
          language,
          _id
        }
      }
    `

    const params = { type, slug, lang }
    try {
      const result = await sanityServerClient.fetch(query, params, {
        next: {
          tags: [
            'translations',
            `translation:${type}:${slug}`,
            `translations:${lang}`,
          ],
        },
      })

      if (!result) {
        return []
      }

      // 构建翻译数组
      const translations: { language: Locale; slug: string }[] = []

      // 添加当前文档
      translations.push({
        language: result.language,
        slug: result.slug.current,
      })

      // 添加所有翻译版本
      if (result._translations) {
        result._translations.forEach(
          (translation: { language: Locale; slug: { current: string } }) => {
            if (translation.slug?.current) {
              translations.push({
                language: translation.language,
                slug: translation.slug.current,
              })
            }
          }
        )
      }

      return translations
    } catch (error) {
      logger.error('DAL', 'Error fetching translations', error as Error)
      return []
    }
  }
)

// --- Prisma Queries ---

export const getLikesAndCommentsForPost = cache(
  withDatabaseMonitoring(
    async (postId: string) => {
      // 优化查询：使用更精确的字段选择和预加载策略
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          sanityDocumentId: true,
          contentType: true,
          likes: {
            select: {
              userId: true,
              createdAt: true,
            },
          },
          comments: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              updatedAt: true,
              status: true,
              isDeleted: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
              // 优化：只预加载必要的回复字段
              replies: {
                select: {
                  id: true,
                  content: true,
                  createdAt: true,
                  status: true,
                  isDeleted: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      avatarUrl: true,
                    },
                  },
                },
                where: {
                  status: 'APPROVED',
                  isDeleted: false,
                },
                orderBy: { createdAt: 'asc' },
              },
            },
            where: {
              parentId: null,
              status: 'APPROVED',
              isDeleted: false,
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              likes: true,
              comments: {
                where: {
                  status: 'APPROVED',
                  isDeleted: false,
                },
              },
            },
          },
        },
      })
      return post
    },
    'getLikesAndCommentsForPost',
    'Post'
  )
)

export const toggleLikePost = withDatabaseMonitoring(
  async (postId: string) => {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    // 检查用户是否已经点赞过这个帖子
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    })

    if (existingLike) {
      // 如果已经点赞，则取消点赞
      await prisma.like.delete({
        where: {
          id: existingLike.id,
        },
      })
      return { action: 'unliked' as const, success: true }
    } else {
      // 如果没有点赞，则创建点赞
      await prisma.like.create({
        data: {
          postId,
          userId,
        },
      })
      return { action: 'liked' as const, success: true }
    }
  },
  'toggleLikePost',
  'Like'
)

// 获取帖子的点赞统计信息
export async function getPostLikeStats(postId: string) {
  const { userId } = await auth()

  const [likesCount, userLike] = await Promise.all([
    prisma.like.count({
      where: { postId },
    }),
    userId
      ? prisma.like.findUnique({
          where: {
            postId_userId: {
              postId,
              userId,
            },
          },
        })
      : null,
  ])

  return {
    likesCount,
    isLikedByUser: !!userLike,
  }
}

export async function createComment(
  postId: string,
  content: string,
  parentId?: string
) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  return withDatabaseMonitoring(
    async () => {
      return prisma.comment.create({
        data: {
          content,
          postId,
          userId,
          parentId,
        },
      })
    },
    'createComment',
    'Comment'
  )
}

export const deleteComment = withDatabaseMonitoring(
  async (commentId: string) => {
    const { userId, sessionClaims } = await auth()
    if (!userId) throw new Error('Unauthorized')

    // 只有评论的创建者或管理员才能删除
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    })

    // 使用类型断言来访问 publicMetadata
    const userRole = (sessionClaims?.publicMetadata as { role?: string })?.role

    if (comment?.userId !== userId && userRole !== 'admin') {
      throw new Error('Forbidden')
    }

    // 删除评论并返回其 postId
    const deletedComment = await prisma.comment.delete({
      where: { id: commentId },
    })
    return deletedComment.postId
  },
  'deleteComment',
  'Comment'
)

// ---- Sanity x Prisma 数据合并 ----

export const PHOTOS_PER_PAGE = 12 // 定义每页加载的照片数量

export const getCollectionAndPhotosBySlug = cache(
  withDatabaseMonitoring(
    async (slug: string, lang: Locale, page: number = 1) => {
      // 分页逻辑
      const start = (page - 1) * PHOTOS_PER_PAGE
      const end = start + PHOTOS_PER_PAGE

      // 1. 从 Sanity 获取基础的照片内容数据（包含SEO字段）
      const query = groq`*[_type == "collection" && slug.current == $slug][0] {
      _id,
      "name": coalesce(name.${lang}, name.en, ""),
      "description": coalesce(description.${lang}, description.en, ""),
      "slug": slug.current,
      updatedAt,
      // SEO 字段（多语言支持）
      seo {
        metaTitle,
        metaDescription,
        focusKeyword,
        socialImage,
        canonicalUrl,
        noIndex
      },
      "photos": photos[${start}...${end}]-> {
        _id,
        "title": coalesce(title.${lang}, title.en, ""),
        "description": coalesce(description.${lang}, description.en, ""),
        "imageFile": imageFile,
        "metadata": imageFile.asset->metadata { lqip, dimensions }
      }
    }`

      const collectionDataFromSanity =
        await sanityServerClient.fetch<GroupAndPhotos>(
          query,
          { slug },
          {
            next: {
              tags: [
                'collections',
                `collection:${slug}`,
                'photos',
                `collection-photos:${slug}`,
                `lang:${lang}`,
              ],
            },
          }
        )

      if (!collectionDataFromSanity || !collectionDataFromSanity.photos) {
        return null
      }

      // 2. 准备从我们自己的数据库中，批量获取这些照片的交互数据
      const photoContentIds = collectionDataFromSanity.photos.map(
        (p: Photo) => p._id
      )
      const { userId } = await auth()

      // 优化查询：批量获取照片交互数据，减少数据传输
      const photoesInfoFromDb = await prisma.post.findMany({
        where: {
          sanityDocumentId: { in: photoContentIds },
          contentType: 'photo',
          isDeleted: false,
        },
        select: {
          id: true,
          sanityDocumentId: true,
          // 条件性查询用户点赞状态
          ...(userId && {
            likes: {
              where: { userId },
              select: { id: true },
              take: 1, // 只需要知道是否存在
            },
          }),
          _count: {
            select: {
              likes: true,
              comments: {
                where: {
                  status: 'APPROVED',
                  isDeleted: false,
                  parentId: null, // 只计算顶级评论
                },
              },
            },
          },
        },
      })

      // 3. 将 Prisma 数据，转换为一个易于查找的 Map（使用 sanityDocumentId 作为 key）
      const photoesMap = new Map(
        photoesInfoFromDb.map((p) => [p.sanityDocumentId, p])
      )

      // 4. (关键) "扩充" Sanity 数据，将 Prisma 数据合并进去
      const enrichedPhotos: EnrichedPhoto[] =
        collectionDataFromSanity.photos.map((photo: Photo) => {
          const photoData = photoesMap.get(photo._id) // 使用 Sanity 的 _id 来查找对应的 Post 记录

          return {
            ...photo,
            // 返回原始asset ID供双层代理使用
            imageUrl: photo.imageFile
              ? typeof photo.imageFile === 'object' &&
                'asset' in photo.imageFile &&
                photo.imageFile.asset
                ? photo.imageFile.asset._ref
                : typeof photo.imageFile === 'string'
                  ? photo.imageFile
                  : extractSanityImageId(urlFor(photo.imageFile).url())
              : undefined,
            post: photoData
              ? {
                  id: photoData.id,
                  likesCount: photoData._count.likes,
                  commentsCount: photoData._count.comments,
                  // 检查用户是否点赞了这张照片
                  isLikedByUser: userId ? photoData.likes.length > 0 : false,
                }
              : null,
          }
        })

      return {
        ...collectionDataFromSanity,
        photos: enrichedPhotos,
      }
    },
    'getCollectionAndPhotosBySlug',
    'Collection'
  )
)

// ---- Log 相关的 Sanity x Prisma 数据合并 ----

// 确保 Postgres 中存在对应的 Post 记录
export const ensureLogPostExists = withDatabaseMonitoring(
  async (sanityDocumentId: string, authorId: string) => {
    const existingPost = await prisma.post.findUnique({
      where: {
        sanityDocumentId,
      },
    })

    if (!existingPost) {
      // 创建新的 Post 记录
      const newPost = await prisma.post.create({
        data: {
          sanityDocumentId,
          contentType: 'log',
          authorId,
          isDeleted: false,
        },
      })
      return newPost
    }

    return existingPost
  },
  'ensureLogPostExists',
  'Post'
)

// 获取log文章及其交互数据（参考getCollectionAndPhotosBySlug的模式）
// 静态生成专用版本 - 不依赖用户认证
export const getLogPostForStaticGeneration = cache(
  withDatabaseMonitoring(
    async (slug: string, lang: Locale): Promise<EnrichedLogPost | null> => {
      // 1. 从 Sanity 获取基础的log内容数据（包含SEO字段）
      const query = groq`*[_type == "log" && slug.current == $slug && language == $lang][0] {
      _id,
      title,
      excerpt,
      content,
      publishedAt,
      "slug": slug.current,
      language,
      tags,
      "author": author->{ name, image },
      mainImage,
      // SEO 字段（单语言）
      seo {
        metaTitle,
        metaDescription,
        focusKeyword,
        socialImage,
        canonicalUrl,
        noIndex,
        readingTime
      }
    }`

      const logDataFromSanity = await sanityServerClient.fetch<LogPostDetails>(
        query,
        { slug, lang },
        {
          next: {
            tags: [
              'logs',
              `log:${slug}`,
              `logs:${lang}`,
              'log-detail',
              'log-interactions',
            ],
          },
        }
      )

      if (!logDataFromSanity) {
        return null
      }

      // 2. 静态生成时跳过用户认证和数据库操作
      // 直接从 Postgres 获取基础交互数据（不依赖用户状态）
      const logInfoFromDb = await prisma.post.findUnique({
        where: {
          sanityDocumentId: logDataFromSanity._id,
        },
        include: {
          _count: {
            select: {
              likes: true,
              comments: {
                where: {
                  status: 'APPROVED',
                  isDeleted: false,
                  parentId: null, // 只计算顶级评论
                },
              },
            },
          },
        },
      })

      // 3. 获取所属合集信息
      const collectionQuery = groq`*[_type == "devCollection" && $logId in logs[]._ref][0] {
      _id,
      "name": name,
      "slug": slug.current,
      "logs": *[_type == "log" && language == $lang && defined(slug.current) && _id in ^.logs[]._ref] {
        _id,
        title,
        "slug": slug.current,
        publishedAt,
        excerpt,
        language
      } [defined(@)]
    }`

      const collectionData = await sanityServerClient.fetch(
        collectionQuery,
        {
          logId: logDataFromSanity._id,
          lang,
        },
        {
          next: {
            tags: [
              'dev-collections',
              `dev-collections:${lang}`,
              'log-collection-mapping',
            ],
          },
        }
      )

      // 4. 合并数据并返回 EnrichedLogPost（静态版本，无用户状态）
      const enrichedLogPost: EnrichedLogPost = {
        ...logDataFromSanity,
        // 生成安全的代理URL
        mainImageUrl: logDataFromSanity.mainImage
          ? typeof logDataFromSanity.mainImage === 'object' &&
            'asset' in logDataFromSanity.mainImage &&
            logDataFromSanity.mainImage.asset
            ? generateSecureImageUrl(logDataFromSanity.mainImage.asset._ref)
            : generateSecureImageUrl(
                extractSanityImageId(urlFor(logDataFromSanity.mainImage).url())
              )
          : undefined,
        post: logInfoFromDb
          ? {
              id: logInfoFromDb.id,
              likesCount: logInfoFromDb._count.likes,
              commentsCount: logInfoFromDb._count.comments,
              isLikedByUser: false, // 静态生成时默认为 false
              hasUserCommented: false,
            }
          : null,
        collection: collectionData
          ? {
              _id: collectionData._id,
              name: collectionData.name,
              slug: collectionData.slug,
              logs: collectionData.logs || [],
            }
          : null,
      }

      return enrichedLogPost
    },
    'getLogPostForStaticGeneration',
    'LogPost'
  )
)

// 动态渲染专用版本 - 包含用户认证
export const getLogPostWithInteractions = cache(
  withDatabaseMonitoring(
    async (slug: string, lang: Locale): Promise<EnrichedLogPost | null> => {
      // 1. 从 Sanity 获取基础的log内容数据（包含SEO字段）
      const query = groq`*[_type == "log" && slug.current == $slug && language == $lang][0] {
      _id,
      title,
      excerpt,
      content,
      publishedAt,
      "slug": slug.current,
      language,
      tags,
      "author": author->{ name, image },
      mainImage,
      // SEO 字段（单语言）
      seo {
        metaTitle,
        metaDescription,
        focusKeyword,
        socialImage,
        canonicalUrl,
        noIndex,
        readingTime
      }
    }`

      const logDataFromSanity = await sanityServerClient.fetch<LogPostDetails>(
        query,
        { slug, lang },
        {
          next: {
            tags: [
              'logs',
              `log:${slug}`,
              `logs:${lang}`,
              'log-detail',
              'log-interactions',
            ],
          },
        }
      )

      if (!logDataFromSanity) {
        return null
      }

      // 2. 获取当前用户信息
      const { userId } = await auth()

      // 3. 确保 Postgres 中存在对应的 Post 记录
      // 使用当前用户ID作为作者，如果没有登录用户则使用默认系统用户ID
      const authorId = userId || 'system-user-id' // 需要确保这个ID在User表中存在
      await ensureLogPostExists(logDataFromSanity._id, authorId)

      // 4. 从 Postgres 获取交互数据
      // 分步查询以避免复杂的类型问题
      const logInfoFromDb = await prisma.post.findUnique({
        where: {
          sanityDocumentId: logDataFromSanity._id,
        },
        include: {
          _count: {
            select: {
              likes: true,
              comments: {
                where: {
                  status: 'APPROVED',
                  isDeleted: false,
                  parentId: null, // 只计算顶级评论，与评论列表显示逻辑一致
                },
              },
            },
          },
        },
      })

      // 单独查询用户是否点赞
      const userLike =
        userId && logInfoFromDb
          ? await prisma.like.findUnique({
              where: {
                postId_userId: {
                  postId: logInfoFromDb.id,
                  userId,
                },
              },
            })
          : null

      // 4. 获取所属合集信息
      const collectionQuery = groq`*[_type == "devCollection" && $logId in logs[]._ref][0] {
      _id,
      "name": name,
      "slug": slug.current,
      "logs": *[_type == "log" && language == $lang && defined(slug.current) && _id in ^.logs[]._ref] {
        _id,
        title,
        "slug": slug.current,
        publishedAt,
        excerpt,
        language
      } [defined(@)]
    }`

      const collectionData = await sanityServerClient.fetch(
        collectionQuery,
        {
          logId: logDataFromSanity._id,
          lang,
        },
        {
          next: {
            tags: [
              'dev-collections',
              `dev-collections:${lang}`,
              'log-collection-mapping',
            ],
          },
        }
      )

      // 5. 合并数据并返回 EnrichedLogPost
      const enrichedLogPost: EnrichedLogPost = {
        ...logDataFromSanity,
        // 生成安全的代理URL
        mainImageUrl: logDataFromSanity.mainImage
          ? typeof logDataFromSanity.mainImage === 'object' &&
            'asset' in logDataFromSanity.mainImage &&
            logDataFromSanity.mainImage.asset
            ? generateSecureImageUrl(logDataFromSanity.mainImage.asset._ref)
            : generateSecureImageUrl(
                extractSanityImageId(urlFor(logDataFromSanity.mainImage).url())
              )
          : undefined,
        post: logInfoFromDb
          ? {
              id: logInfoFromDb.id,
              likesCount: logInfoFromDb._count.likes,
              commentsCount: logInfoFromDb._count.comments,
              isLikedByUser: !!userLike,
              hasUserCommented: false,
            }
          : null,
        collection: collectionData
          ? {
              _id: collectionData._id,
              name: collectionData.name,
              slug: collectionData.slug,
              logs: collectionData.logs || [],
            }
          : null,
      }

      return enrichedLogPost
    },
    'getLogPostWithInteractions',
    'LogPost'
  )
)

// 获取当前log所属合集的其他文章列表（用于左侧导航）
export const getCollectionLogsBySlug = cache(
  async (logSlug: string, lang: Locale) => {
    // 1. 先通过log slug找到对应的log _id
    const logQuery = groq`*[_type == "log" && slug.current == $logSlug && language == $lang][0] {
      _id
    }`

    const logData = await sanityServerClient.fetch<{ _id: string } | null>(
      logQuery,
      { logSlug, lang },
      {
        next: {
          tags: ['logs', `log:${logSlug}`, `logs:${lang}`],
        },
      }
    )

    if (!logData) {
      return null
    }

    // 2. 通过log _id找到所属的devCollection及其所有logs
    const collectionQuery = groq`*[_type == "devCollection" && $logId in logs[]._ref][0] {
      _id,
      "name": name,
      "slug": slug.current,
      "logs": *[_type == "log" && language == $lang && defined(slug.current) && _id in ^.logs[]._ref] | order(publishedAt asc) {
        _id,
        title,
        "slug": slug.current,
        publishedAt,
        excerpt,
        language
      } [defined(@)]
    }`

    const collectionData = await sanityServerClient.fetch(
      collectionQuery,
      {
        logId: logData._id,
        lang,
      },
      {
        next: {
          tags: [
            'dev-collections',
            `dev-collections:${lang}`,
            'collection-logs',
          ],
        },
      }
    )

    return collectionData
  }
)

// 获取作者信息（用于 about 页面）
export const getAuthorBySlug = cache(
  async (slug: string): Promise<Author | null> => {
    const query = groq`*[_type == "author" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    image,
    bio,
    // SEO 字段
    metaTitle,
    metaDescription,
    focusKeyword,
    socialImage,
    canonicalUrl,
    noIndex,
    socialLinks
  }`

    const authorData = await sanityServerClient.fetch<{
      image?: SanityImageSource
      socialImage?: SanityImageSource
      [key: string]: unknown
    } | null>(query, { slug }, { next: { tags: ['author-data'] } })

    if (!authorData) {
      return null
    }

    // 生成安全的图片URL
    let imageId: string | null = null
    let socialImageId: string | null = null

    if (authorData.image) {
      if (
        typeof authorData.image === 'object' &&
        'asset' in authorData.image &&
        authorData.image.asset
      ) {
        imageId = authorData.image.asset._ref
      } else {
        imageId = extractSanityImageId(urlFor(authorData.image).url())
      }
    }

    if (authorData.socialImage) {
      if (
        typeof authorData.socialImage === 'object' &&
        'asset' in authorData.socialImage &&
        authorData.socialImage.asset
      ) {
        socialImageId = authorData.socialImage.asset._ref
      } else {
        socialImageId = extractSanityImageId(
          urlFor(authorData.socialImage).url()
        )
      }
    }

    const author: Author = {
      ...authorData,
      imageUrl: imageId ? generateSecureImageUrl(imageId) : undefined,
      socialImageUrl: socialImageId
        ? generateSecureImageUrl(socialImageId)
        : undefined,
    } as Author

    return author
  }
)

// ---- Warmup 相关的数据获取函数 ----

// 获取所有collection的基本信息（用于warmup选择）
export const getCollectionsForWarmup = cache(async () => {
  const query = groq`*[_type == "collection"] | order(orderRank) {
    _id,
    "name": name,
    "slug": slug.current,
    "photosCount": count(photos)
  }`

  return sanityServerClient.fetch(
    query,
    {},
    {
      next: {
        tags: ['collections', 'warmup-collections'],
      },
    }
  )
})

// 获取所有dev collection的基本信息（用于warmup选择）
export const getDevCollectionsForWarmup = cache(async () => {
  const query = groq`*[_type == "devCollection"] | order(orderRank) {
    _id,
    "name": name,
    "slug": slug.current,
    coverImage
  }`

  return sanityServerClient.fetch(
    query,
    {},
    {
      next: {
        tags: ['dev-collections', 'warmup-dev-collections'],
      },
    }
  )
})

// 获取指定collection的photo数量
export const getCollectionPhotoCount = cache(async (collectionId: string) => {
  const query = groq`*[_type == "collection" && _id == $collectionId][0] {
    "photosCount": count(photos)
  }`

  const result = await sanityServerClient.fetch(
    query,
    { collectionId },
    {
      next: {
        tags: [
          'collections',
          `collection:${collectionId}`,
          'warmup-photo-count',
        ],
      },
    }
  )

  return result?.photosCount || 0
})

// 获取所有collection cover images的数量
export const getAllCollectionCoversCount = cache(async () => {
  const query = groq`count(*[_type == "collection" && defined(coverImage)])`

  return sanityServerClient.fetch(
    query,
    {},
    {
      next: {
        tags: ['collections', 'warmup-covers-count'],
      },
    }
  )
})

// 获取所有dev collection covers的数量
export const getAllDevCollectionCoversCount = cache(async () => {
  const query = groq`count(*[_type == "devCollection" && defined(coverImage)])`

  return sanityServerClient.fetch(
    query,
    {},
    {
      next: {
        tags: ['dev-collections', 'warmup-dev-covers-count'],
      },
    }
  )
})

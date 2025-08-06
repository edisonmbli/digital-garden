// app/lib/dal.ts
import 'server-only'
import { cache } from 'react'
import { groq } from 'next-sanity'
import { auth } from '@clerk/nextjs/server'
import prisma from './prisma'
import { client as sanityClient } from '@/sanity/client'
import type { Locale } from '@/i18n-config'
import type {
  DevCollection,
  LogPost,
  Photo,
  GroupAndPhotos,
  LogPostDetails,
  EnrichedPhoto,
  EnrichedLogPost,
} from '@/types/sanity'

// --- Sanity Queries ---

// 只获取那些被标记为"精选"的影像组，用于首页
export const getHeroCollections = cache(async () => {
  const query = groq`*[_type == "collection" && isFeatured == true] | order(orderRank) {
    _id,
    "name": name,
    "description": description,
    "slug": slug.current,
    "coverImageUrl": coverImage.asset->url,
    isFeatured,
    orderRank
  }`

  return sanityClient.fetch(query)
})

// 获取所有的影像组（未来支持分页），用于 /gallery 列表页
export const getAllCollections = cache(async () => {
  const query = groq`*[_type == "collection"] | order(orderRank) {
    _id,
    "name": name,
    "description": description,
    "slug": slug.current,
    "coverImageUrl": coverImage.asset->url,
    isFeatured,
    orderRank
  }`

  return sanityClient.fetch(query)
})

export const getLogPosts = cache(async (lang: Locale) => {
  const query = groq`*[_type == "log" && language == $lang] | order(publishedAt desc) {
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    excerpt
  }`
  return sanityClient.fetch<LogPost[]>(query, { lang })
})

export const getLogPostBySlug = cache(async (slug: string, lang: Locale) => {
  const query = groq`*[_type == "log" && slug.current == $slug && language == $lang][0] {
    _id,
    title,
    content, // Portable Text
    publishedAt,
    "author": author->{ name, "avatarUrl": image.asset->url }
  }`
  return sanityClient.fetch<LogPostDetails>(query, { slug, lang })
})

// 获取所有开发教程合集（用于列表页）
export const getAllDevCollectionsAndLogs = cache(async (lang: Locale) => {
  const query = groq`*[_type == "devCollection"] | order(orderRank asc, _createdAt desc) {
    _id,
    "name": name,
    "description": description,
    "slug": slug.current,
    "coverImageUrl": coverImage.asset->url,
    isFeatured,
    orderRank,
    "logs": *[_type == "log" && language == $lang && defined(slug.current) && _id in ^.logs[]._ref] {
      _id,
      title,
      "slug": slug.current,
      publishedAt,
      excerpt,
      language
    } [defined(@)],
    "logsCount": count(*[_type == "log" && language == $lang && defined(slug.current) && _id in ^.logs[]._ref])
  }`

  const devCollections = await sanityClient.fetch<DevCollection[]>(query, {
    lang,
  })

  // 直接返回完整的 DevCollection 数据，包含所有 logs
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
    "coverImageUrl": coverImage.asset->url,
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

    const devCollection = await sanityClient.fetch<DevCollection | null>(
      query,
      { slug, lang }
    )

    if (!devCollection) {
      return null
    }

    return {
      _id: devCollection._id,
      name: devCollection.name,
      description: devCollection.description,
      slug: devCollection.slug,
      coverImageUrl: devCollection.coverImageUrl,
      isFeatured: devCollection.isFeatured,
      logs: devCollection.logs || [],
    }
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
      const result = await sanityClient.fetch(query, params)

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
      console.error('Error fetching translations:', error)
      return []
    }
  }
)

// --- Prisma Queries ---

export const getLikesAndCommentsForPost = cache(async (postId: string) => {
  // 我们通过 Sanity 的 _id (存在 Post.contentId) 来查找我们自己的 Post
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      likes: {
        select: { userId: true },
      },
      comments: {
        include: {
          user: {
            select: { name: true, avatarUrl: true },
          },
          replies: true, // 预加载回复
        },
        where: { parentId: null }, // 只获取顶级评论
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  return post
})

export async function toggleLikePost(postId: string) {
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
}

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

  return prisma.comment.create({
    data: {
      content,
      postId,
      userId,
      parentId,
    },
  })
}

export async function deleteComment(commentId: string) {
  const { userId, sessionClaims } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // 只有评论的创建者或管理员才能删除
  const comment = await prisma.comment.findUnique({ where: { id: commentId } })

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
}

// ---- Sanity x Prisma 数据合并 ----

export const PHOTOS_PER_PAGE = 12 // 定义每页加载的照片数量

export const getCollectionAndPhotosBySlug = cache(
  async (slug: string, lang: Locale, page: number = 1) => {
    // 分页逻辑
    const start = (page - 1) * PHOTOS_PER_PAGE
    const end = start + PHOTOS_PER_PAGE

    console.log('🔍 Debug: Query parameters:', { slug, lang, start, end })

    // 1. 从 Sanity 获取基础的照片内容数据（新schema不再有language字段）
    const query = groq`*[_type == "collection" && slug.current == $slug][0] {
      "name": coalesce(name.${lang}, name.en, ""),
      "description": coalesce(description.${lang}, description.en, ""),
      "photos": photos[${start}...${end}]-> {
        _id,
        "title": coalesce(title.${lang}, title.en, ""),
        "description": coalesce(description.${lang}, description.en, ""),
        "imageUrl": imageFile.asset->url,
        "metadata": imageFile.asset->metadata { lqip, dimensions }
      }
    }`

    console.log('🔍 Debug: GROQ Query:', query)

    const collectionDataFromSanity = await sanityClient.fetch<GroupAndPhotos>(
      query,
      { slug }
    )

    console.log('🔍 Debug: Sanity query result:', {
      hasResult: !!collectionDataFromSanity,
      name: collectionDataFromSanity?.name,
      photosCount: collectionDataFromSanity?.photos?.length,
      firstPhotoId: collectionDataFromSanity?.photos?.[0]?._id,
    })

    if (!collectionDataFromSanity || !collectionDataFromSanity.photos) {
      console.log('❌ Debug: No collection data found from Sanity')
      return null
    }

    // 2. 准备从我们自己的数据库中，批量获取这些照片的交互数据
    const photoContentIds = collectionDataFromSanity.photos.map(
      (p: Photo) => p._id
    )
    const { userId } = await auth()

    console.log('🔍 Debug: Photo IDs from Sanity:', photoContentIds)
    console.log('🔍 Debug: Current user ID:', userId)

    // 简化查询，直接获取需要的数据
    const photoesInfoFromDb = await prisma.post.findMany({
      where: {
        sanityDocumentId: { in: photoContentIds },
        contentType: 'photo',
        isDeleted: false, // 过滤掉已软删除的记录
      },
      select: {
        id: true,
        sanityDocumentId: true,
        likes: userId
          ? {
              where: { userId },
              select: { id: true },
            }
          : false,
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

    console.log('🔍 Debug: Posts found in Prisma:', {
      totalFound: photoesInfoFromDb.length,
      foundIds: photoesInfoFromDb.map((p) => p.sanityDocumentId),
      missingIds: photoContentIds.filter(
        (id) => !photoesInfoFromDb.find((p) => p.sanityDocumentId === id)
      ),
    })

    // 3. 将 Prisma 数据，转换为一个易于查找的 Map（使用 sanityDocumentId 作为 key）
    const photoesMap = new Map(
      photoesInfoFromDb.map((p) => [p.sanityDocumentId, p])
    )

    // 4. (关键) "扩充" Sanity 数据，将 Prisma 数据合并进去
    const enrichedPhotos: EnrichedPhoto[] = collectionDataFromSanity.photos.map(
      (photo: Photo) => {
        const photoData = photoesMap.get(photo._id) // 使用 Sanity 的 _id 来查找对应的 Post 记录

        console.log('🔍 Debug: Building enriched photo:', {
          photoId: photo._id,
          hasPhotoData: !!photoData,
          photoDataFields: photoData ? Object.keys(photoData) : 'No photo data',
          likesCount: photoData?._count.likes,
          commentsCount: photoData?._count.comments,
          userLikes: photoData?.likes,
        })

        return {
          ...photo,
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
      }
    )

    return {
      ...collectionDataFromSanity,
      photos: enrichedPhotos,
    }
  }
)

// ---- Log 相关的 Sanity x Prisma 数据合并 ----

// 确保 Postgres 中存在对应的 Post 记录
export async function ensureLogPostExists(sanityDocumentId: string, authorId: string) {
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
    console.log('✅ Created new Post record for log:', sanityDocumentId)
    return newPost
  }

  return existingPost
}

// 获取log文章及其交互数据（参考getCollectionAndPhotosBySlug的模式）
export const getLogPostWithInteractions = cache(
  async (slug: string, lang: Locale): Promise<EnrichedLogPost | null> => {
    console.log('🔍 Debug: getLogPostWithInteractions parameters:', { slug, lang })

    // 1. 从 Sanity 获取基础的log内容数据
    const query = groq`*[_type == "log" && slug.current == $slug && language == $lang][0] {
      _id,
      title,
      content,
      publishedAt,
      "author": author->{ name, "avatarUrl": image.asset->url },
      "mainImageUrl": mainImage.asset->url
    }`

    console.log('🔍 Debug: GROQ Query for log:', query)

    const logDataFromSanity = await sanityClient.fetch<LogPostDetails>(
      query,
      { slug, lang }
    )

    console.log('🔍 Debug: Sanity log query result:', {
      hasResult: !!logDataFromSanity,
      title: logDataFromSanity?.title,
      logId: logDataFromSanity?._id,
    })

    if (!logDataFromSanity) {
      console.log('❌ Debug: No log data found from Sanity')
      return null
    }

    // 2. 获取当前用户信息
    const { userId } = await auth()
    
    // 3. 确保 Postgres 中存在对应的 Post 记录
    // 使用当前用户ID作为作者，如果没有登录用户则使用默认系统用户ID
    const authorId = userId || 'system-user-id' // 需要确保这个ID在User表中存在
    await ensureLogPostExists(logDataFromSanity._id, authorId)

    // 4. 从 Postgres 获取交互数据

    console.log('🔍 Debug: Log ID from Sanity:', logDataFromSanity._id)
    console.log('🔍 Debug: Current user ID:', userId)

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
    const userLike = userId && logInfoFromDb
      ? await prisma.like.findUnique({
          where: {
            postId_userId: {
              postId: logInfoFromDb.id,
              userId,
            },
          },
        })
      : null

    console.log('🔍 Debug: Post found in Prisma:', {
      hasLogData: !!logInfoFromDb,
      logDataFields: logInfoFromDb ? Object.keys(logInfoFromDb) : 'No log data',
      likesCount: logInfoFromDb?._count.likes,
      commentsCount: logInfoFromDb?._count.comments,
      userLiked: !!userLike,
    })

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

    const collectionData = await sanityClient.fetch(collectionQuery, {
      logId: logDataFromSanity._id,
      lang,
    })

    console.log('🔍 Debug: Collection data:', {
      hasCollection: !!collectionData,
      collectionName: collectionData?.name,
      logsCount: collectionData?.logs?.length,
    })

    // 5. 合并数据并返回 EnrichedLogPost
    const enrichedLogPost: EnrichedLogPost = {
      ...logDataFromSanity,
      post: logInfoFromDb
        ? {
            id: logInfoFromDb.id,
            likesCount: logInfoFromDb._count.likes,
            commentsCount: logInfoFromDb._count.comments,
            isLikedByUser: !!userLike,
            hasUserCommented: false, // TODO: 可以后续添加用户是否评论过的逻辑
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
  }
)

// 获取当前log所属合集的其他文章列表（用于左侧导航）
export const getCollectionLogsBySlug = cache(
  async (logSlug: string, lang: Locale) => {
    console.log('🔍 Debug: getCollectionLogsBySlug parameters:', { logSlug, lang })

    // 1. 先通过log slug找到对应的log _id
    const logQuery = groq`*[_type == "log" && slug.current == $logSlug && language == $lang][0] {
      _id
    }`

    const logData = await sanityClient.fetch<{ _id: string } | null>(
      logQuery,
      { logSlug, lang }
    )

    if (!logData) {
      console.log('❌ Debug: No log found for slug:', logSlug)
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

    const collectionData = await sanityClient.fetch(collectionQuery, {
      logId: logData._id,
      lang,
    })

    console.log('🔍 Debug: Collection logs result:', {
      hasCollection: !!collectionData,
      collectionName: collectionData?.name,
      logsCount: collectionData?.logs?.length,
    })

    return collectionData
  }
)

// app/lib/dal.ts
import 'server-only'
import { auth } from '@clerk/nextjs/server'
import { cache } from 'react'
import prisma from './prisma'
import { client as sanityClient } from '@/sanity/client' // 假设你已创建 Sanity 客户端
import { groq } from 'next-sanity'
import { type Locale } from '@/i18n-config'

import type {
  FeaturedGroup,
  Photo,
  LogPost,
  GroupAndPhotos,
  LogPostDetails,
  EnrichedPhoto,
} from '@/types/sanity'

// --- Sanity Queries ---

// 只获取那些被标记为“精选”的影像组，用于首页
export const getHeroCollections = cache(async (lang: Locale) => {
  const query = groq`*[_type == "collection" && language == $lang && isFeatured == true] | order(_createdAt desc) {
    _id,
    name,
    "slug": slug.current,
    "coverImageUrl": coverImage.asset->url
  }`
  return sanityClient.fetch<FeaturedGroup[]>(query, { lang })
})

// 获取所有的影像组（未来支持分页），用于 /gallery 列表页
export const getAllCollections = cache(async (lang: Locale) => {
  const query = groq`*[_type == "collection" && language == $lang] | order(_createdAt desc) {
    _id,
    name,
    "slug": slug.current,
    "coverImageUrl": coverImage.asset->url
  }`
  return sanityClient.fetch<FeaturedGroup[]>(query, { lang })
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
    userId ? prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    }) : null,
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

export const getGroupAndPhotosBySlug = cache(
  async (slug: string, lang: Locale, page: number = 1) => {
    // 分页逻辑
    const start = (page - 1) * PHOTOS_PER_PAGE
    const end = start + PHOTOS_PER_PAGE

    // 1. 从 Sanity 获取基础的照片内容数据
    const query = groq`*[_type == "collection" && slug.current == $slug && language == $lang][0] {
      name,
      description,
      "photos": photos[${start}...${end}]-> {
        _id,
        "title": coalesce(title.${lang}, title.en, ""),
        "description": coalesce(description.${lang}, description.en, ""),
        "imageUrl": imageFile.asset->url,
        "metadata": imageFile.asset->metadata { lqip, dimensions }
      }
    }`

    const collectionDataFromSanity = await sanityClient.fetch<GroupAndPhotos>(
      query,
      {
        slug,
        lang,
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
            comments: true,
          },
        },
      },
    })

    // 3. 将 Prisma 数据，转换为一个易于查找的 Map（使用 sanityDocumentId 作为 key）
    const photoesMap = new Map(
      photoesInfoFromDb.map((p) => [p.sanityDocumentId, p])
    )

    // 4. (关键) "扩充" Sanity 数据，将 Prisma 数据合并进去
    const enrichedPhotos: EnrichedPhoto[] = collectionDataFromSanity.photos.map(
      (photo: Photo) => {
        const photoData = photoesMap.get(photo._id) // 使用 Sanity 的 _id 来查找对应的 Post 记录
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

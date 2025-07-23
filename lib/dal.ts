// app/lib/dal.ts
import 'server-only'
import { cache } from 'react'
import prisma from './prisma'
import { client as sanityClient } from '@/sanity/client' // 假设你已创建 Sanity 客户端
import { groq } from 'next-sanity'
import { type Locale } from '@/i18n-config'

import type {
  FeaturedGroup,
  LogPost,
  GroupAndPhotos,
  LogPostDetails,
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

export const PHOTOS_PER_PAGE = 12 // 定义每页加载的照片数量

export const getGroupAndPhotosBySlug = cache(
  async (slug: string, lang: Locale, page: number = 1) => {
    const start = (page - 1) * PHOTOS_PER_PAGE
    const end = start + PHOTOS_PER_PAGE

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
    return sanityClient.fetch<GroupAndPhotos>(query, { slug, lang })
  }
)

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

    const params = {
      type,
      slug,
      lang,
    }

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

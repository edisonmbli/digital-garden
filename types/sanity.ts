// types/sanity.ts

import type { PortableTextBlock } from '@portabletext/types'

// 多语言字段类型
export type MultilingualField = {
  zh?: string
  en?: string
}

// Collection类型（支持字段级别国际化）
export type Collection = {
  _id: string
  name: MultilingualField
  description?: MultilingualField
  slug: string
  coverImageUrl?: string | null
  isFeatured: boolean
}

// 对应 getFeaturedGroups 查询返回的数组中的单个对象（保持向后兼容）
export type FeaturedGroup = Collection

// 对应 getLogPosts 查询返回的数组中的单个对象
export type LogPost = {
  _id: string
  title: string
  slug: string
  publishedAt: string
  excerpt?: string
}

// 对应 getGroupAndPhotosBySlug 查询返回的对象
export type GroupAndPhotos = {
  name: string
  description: string
  photos: Photo[]
}

// 对应 getLogPostBySlug 查询返回的对象
export type LogPostDetails = {
  _id: string
  title: string
  content: PortableTextBlock[]
  publishedAt: string
  author: {
    name: string
    avatarUrl?: string
  }
}

// 新增 Photo 类型定义
export type Photo = {
  _id: string
  title: string
  description?: string
  imageUrl: string
  metadata: {
    lqip: string
    dimensions: {
      width: number
      height: number
    }
  }
}

// 如果需要支持多语言切换，可以添加
export type MultilingualPhoto = {
  _id: string
  allTitles: Record<string, string>
  allDescriptions: Record<string, string>
  imageUrl: string
  metadata: {
    lqip: string
    dimensions?: {
      width: number
      height: number
    }
  }
}

// 翻译映射类型
export type Translation = {
  language: string
  slug: string
}

export type TranslationMap = Record<string, string> // { 'en': 'norway_en', 'zh': 'norway_zh' }

// 扩展 Photo 类型，包含了Prisma Post数据、"扩充后"的照片类型
export type EnrichedPhoto = {
  _id: string
  imageUrl: string
  title?: string
  description?: string
  metadata?: {
    lqip: string
    dimensions: {
      width: number
      height: number
    }
  }
  // 关联的 Prisma Post 数据
  post: {
    id: string
    likesCount: number
    isLikedByUser: boolean
    commentsCount: number
    hasUserCommented?: boolean
  } | null
}

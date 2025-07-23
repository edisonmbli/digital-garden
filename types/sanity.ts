// types/sanity.ts

import type { PortableTextBlock } from '@portabletext/types'

// 对应 getFeaturedGroups 查询返回的数组中的单个对象
export type FeaturedGroup = {
  _id: string
  name: string
  slug: string
  coverImageUrl?: string
}

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
    dimensions?: {
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

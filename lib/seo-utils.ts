import { type Metadata } from 'next'
import { type Locale } from '@/i18n-config'
import { urlFor } from '@/sanity/image'

// SEO相关类型定义
interface SEOFields {
  metaTitle?: string
  metaDescription?: string
  focusKeyword?: string
  socialImage?: unknown
  canonicalUrl?: string
  noIndex?: boolean
  readingTime?: number
}

interface MultilingualSEOFields {
  en?: SEOFields
  zh?: SEOFields
}

export interface CollectionData {
  name?: string // 已经根据语言处理过的名称
  title?: string
  description?: string // 已经根据语言处理过的描述
  coverImage?: unknown
  photos?: unknown[]
  seo?: MultilingualSEOFields
}

export interface LogData {
  title?: string
  excerpt?: string
  content?: unknown
  publishedAt?: string
  mainImageUrl?: string
  tags?: string[]
  seo?: SEOFields
}

interface PortableTextBlock {
  _type: string
  children?: Array<{
    _type: string
    text: string
  }>
}

// SEO配置常量
export const SEO_CONFIG = {
  siteName: 'Digital Garden AI',
  siteDescription: {
    en: 'A digital garden showcasing photography collections and development tutorials. Explore visual stories and learn web development through practical guides.',
    zh: '数字花园AI - 展示摄影作品集和开发教程的创意空间。探索视觉故事，通过实用指南学习网页开发。',
  },
  siteUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com',
  author: 'Your Name',
  keywords: {
    en: ['photography', 'web development', 'tutorials', 'digital garden', 'creative coding', 'Next.js'],
    zh: ['摄影', '网页开发', '教程', '数字花园', '创意编程', 'Next.js'],
  },
  social: {
    twitter: '@yourusername',
    github: 'https://github.com/yourusername',
  },
}

// 生成基础metadata
export function generateBaseMetadata(lang: Locale): Metadata {
  const description = SEO_CONFIG.siteDescription[lang]
  const keywords = SEO_CONFIG.keywords[lang]
  
  return {
    title: {
      template: `%s | ${SEO_CONFIG.siteName}`,
      default: SEO_CONFIG.siteName,
    },
    description,
    keywords,
    authors: [{ name: SEO_CONFIG.author }],
    creator: SEO_CONFIG.author,
    publisher: SEO_CONFIG.author,
    metadataBase: new URL(SEO_CONFIG.siteUrl),
    alternates: {
      canonical: `/${lang}`,
      languages: {
        'en': '/en',
        'zh': '/zh',
      },
    },
    openGraph: {
      type: 'website',
      locale: lang === 'zh' ? 'zh_CN' : 'en_US',
      url: SEO_CONFIG.siteUrl,
      siteName: SEO_CONFIG.siteName,
      title: SEO_CONFIG.siteName,
      description,
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: SEO_CONFIG.siteName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: SEO_CONFIG.siteName,
      description,
      creator: SEO_CONFIG.social.twitter,
      images: ['/og-image.jpg'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: 'your-google-verification-code',
      // yandex: 'your-yandex-verification-code',
      // yahoo: 'your-yahoo-verification-code',
    },
  }
}

// 生成页面级metadata
export function generatePageMetadata({
  title,
  description,
  path,
  lang,
  image,
  publishedTime,
  modifiedTime,
  type = 'website',
}: {
  title: string
  description: string
  path: string
  lang: Locale
  image?: string
  publishedTime?: string
  modifiedTime?: string
  type?: 'website' | 'article'
}): Metadata {
  const url = `${SEO_CONFIG.siteUrl}/${lang}${path}`
  const ogImage = image || '/og-image.jpg'
  
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        'en': `/en${path}`,
        'zh': `/zh${path}`,
      },
    },
    openGraph: {
      type,
      locale: lang === 'zh' ? 'zh_CN' : 'en_US',
      url,
      siteName: SEO_CONFIG.siteName,
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: SEO_CONFIG.social.twitter,
      images: [ogImage],
    },
  }
}

// 生成结构化数据
export function generateStructuredData({
  type,
  title,
  description,
  url,
  image,
  publishedTime,
  modifiedTime,
  author,
}: {
  type: 'WebSite' | 'Article' | 'ImageGallery' | 'CollectionPage'
  title: string
  description: string
  url: string
  image?: string
  publishedTime?: string
  modifiedTime?: string
  author?: string
}) {
  const baseData = {
    '@context': 'https://schema.org',
    '@type': type,
    name: title,
    description,
    url,
    ...(image && { image }),
  }

  switch (type) {
    case 'WebSite':
      return {
        ...baseData,
        '@type': 'WebSite',
        publisher: {
          '@type': 'Person',
          name: SEO_CONFIG.author,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SEO_CONFIG.siteUrl}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      }

    case 'Article':
      return {
        ...baseData,
        '@type': 'Article',
        headline: title,
        author: {
          '@type': 'Person',
          name: author || SEO_CONFIG.author,
        },
        publisher: {
          '@type': 'Person',
          name: SEO_CONFIG.author,
        },
        ...(publishedTime && { datePublished: publishedTime }),
        ...(modifiedTime && { dateModified: modifiedTime }),
      }

    case 'ImageGallery':
      return {
        ...baseData,
        '@type': 'ImageGallery',
        creator: {
          '@type': 'Person',
          name: SEO_CONFIG.author,
        },
      }

    case 'CollectionPage':
      return {
        ...baseData,
        '@type': 'CollectionPage',
        isPartOf: {
          '@type': 'WebSite',
          name: SEO_CONFIG.siteName,
          url: SEO_CONFIG.siteUrl,
        },
      }

    default:
      return baseData
  }
}

// 智能SEO内容生成 - Collection类型（支持多语言SEO字段）
export function generateCollectionSEO({
  collection,
  lang,
  path,
}: {
  collection: CollectionData
  lang: Locale
  path: string
}): Metadata {
  // 多层级回退策略
  const title = 
    collection.seo?.[lang]?.metaTitle || // 1. 优先使用对应语言的SEO标题
    collection.seo?.en?.metaTitle || // 2. 回退到英文SEO标题
    collection.name || // 3. 使用已处理的名称
    collection.title || // 4. 使用通用标题
    'Photography Collection' // 5. 最终回退

  const description = 
    collection.seo?.[lang]?.metaDescription || // 1. 优先使用对应语言的SEO描述
    collection.seo?.en?.metaDescription || // 2. 回退到英文SEO描述
    collection.description || // 3. 使用已处理的描述
    generateAutoDescription(collection, lang) // 4. 自动生成描述

  // 社交图片处理
  const socialImage = 
    collection.seo?.[lang]?.socialImage || 
    collection.seo?.en?.socialImage ||
    collection.coverImage

  const ogImage = socialImage 
    ? urlFor(socialImage).width(1200).height(630).url()
    : '/og-image.jpg'

  // 规范URL处理
  const canonicalUrl = 
    collection.seo?.[lang]?.canonicalUrl ||
    collection.seo?.en?.canonicalUrl ||
    `${SEO_CONFIG.siteUrl}/${lang}${path}`

  // 关键词处理
  const focusKeyword = 
    collection.seo?.[lang]?.focusKeyword ||
    collection.seo?.en?.focusKeyword

  const keywords = focusKeyword 
    ? [focusKeyword, ...SEO_CONFIG.keywords[lang]]
    : SEO_CONFIG.keywords[lang]

  // noIndex处理
  const noIndex = collection.seo?.[lang]?.noIndex || collection.seo?.en?.noIndex || false

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en': `/en${path}`,
        'zh': `/zh${path}`,
      },
    },
    openGraph: {
      type: 'website',
      locale: lang === 'zh' ? 'zh_CN' : 'en_US',
      url: canonicalUrl,
      siteName: SEO_CONFIG.siteName,
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: SEO_CONFIG.social.twitter,
      images: [ogImage],
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

// 智能SEO内容生成 - Log类型（单语言配合i18n）
export function generateLogSEO({
  log,
  lang,
  path,
}: {
  log: LogData
  lang: Locale
  path: string
}): Metadata {
  // 多层级回退策略
  const title = 
    log.seo?.metaTitle || // 1. 优先使用SEO标题
    log.title || // 2. 使用文章标题
    'Development Tutorial' // 3. 最终回退

  const description = 
    log.seo?.metaDescription || // 1. 优先使用SEO描述
    log.excerpt || // 2. 使用摘要
    extractTextFromContent(log.content, 160) || // 3. 从内容提取
    generateAutoLogDescription(log, lang) // 4. 自动生成描述

  // 社交图片处理
  const socialImage = log.seo?.socialImage || log.mainImageUrl
  const ogImage = socialImage 
    ? (typeof socialImage === 'string' ? socialImage : urlFor(socialImage).width(1200).height(630).url())
    : '/og-image.jpg'

  // 规范URL处理
  const canonicalUrl = 
    log.seo?.canonicalUrl ||
    `${SEO_CONFIG.siteUrl}/${lang}${path}`

  // 关键词处理
  const focusKeyword = log.seo?.focusKeyword
  const keywords = focusKeyword 
    ? [focusKeyword, ...SEO_CONFIG.keywords[lang]]
    : SEO_CONFIG.keywords[lang]

  // 标签处理
  if (log.tags && log.tags.length > 0) {
    keywords.push(...log.tags)
  }

  // noIndex处理
  const noIndex = log.seo?.noIndex || false

  // 发布时间处理
  const publishedTime = log.publishedAt ? new Date(log.publishedAt).toISOString() : undefined

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en': `/en${path}`,
        'zh': `/zh${path}`,
      },
    },
    openGraph: {
      type: 'article',
      locale: lang === 'zh' ? 'zh_CN' : 'en_US',
      url: canonicalUrl,
      siteName: SEO_CONFIG.siteName,
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(publishedTime && { publishedTime }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: SEO_CONFIG.social.twitter,
      images: [ogImage],
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

// 辅助函数：自动生成Collection描述
function generateAutoDescription(collection: CollectionData, lang: Locale): string {
  const collectionName = collection.name || collection.title || (lang === 'zh' ? '摄影作品集' : 'Photography Collection')
  const templates = {
    en: `Explore the "${collectionName}" collection featuring ${collection.photos?.length || 'multiple'} stunning photographs. Discover visual stories and artistic perspectives.`,
    zh: `探索"${collectionName}"作品集，包含${collection.photos?.length || '多张'}精美摄影作品。发现视觉故事和艺术视角。`,
  }
  return templates[lang]
}

// 辅助函数：自动生成Log描述
function generateAutoLogDescription(log: LogData, lang: Locale): string {
  const templates = {
    en: `Learn about ${log.title || 'web development'} in this comprehensive tutorial. Step-by-step guide with practical examples and best practices.`,
    zh: `在这个综合教程中学习${log.title || '网页开发'}。包含实用示例和最佳实践的分步指南。`,
  }
  return templates[lang]
}

// 辅助函数：从富文本内容提取纯文本
function extractTextFromContent(content: unknown, maxLength: number = 160): string {
  if (!content) return ''
  
  // 如果是数组（Portable Text格式）
  if (Array.isArray(content)) {
    const text = content
      .filter((block: PortableTextBlock) => block._type === 'block' && block.children)
      .map((block: PortableTextBlock) => 
        block.children
          ?.filter(child => child._type === 'span')
          .map(child => child.text)
          .join('') || ''
      )
      .join(' ')
    
    return text.length > maxLength 
      ? text.substring(0, maxLength).trim() + '...'
      : text
  }
  
  // 如果是字符串
  if (typeof content === 'string') {
    return content.length > maxLength 
      ? content.substring(0, maxLength).trim() + '...'
      : content
  }
  
  return ''
}
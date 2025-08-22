// lib/sanity-integration-actions.ts
// Sanity CMS集成相关的Server Actions

'use server'

import { auth } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/admin-actions'
import { sanityServerClient } from '@/lib/sanity-server'
import { PortableTextElement } from '@/lib/markdown-to-portable-text'
import { nanoid } from 'nanoid'
import { revalidateTag } from 'next/cache'

interface CreateLogPostData {
  title: string
  content: PortableTextElement[]
  excerpt?: string
  language: 'zh' | 'en'
  tags?: string[]
  publishedAt?: string
}

interface CreateLogResult {
  success: boolean
  data?: {
    _id: string
    slug: string
    title: string
    language: string
    studioUrl: string
    frontendUrl: string
  }
  error?: string
}

/**
 * 验证管理员权限
 */
async function verifyAdminAccess(): Promise<string> {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('未登录')
  }

  const adminCheck = await isAdmin()

  if (!adminCheck) {
    throw new Error('权限不足：需要管理员权限')
  }

  return userId
}

/**
 * 生成URL友好的slug
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 96)
}

/**
 * 估算阅读时间（分钟）
 */
function estimateReadingTime(content: PortableTextElement[]): number {
  let wordCount = 0

  const countWords = (blocks: PortableTextElement[]): void => {
    blocks.forEach((block) => {
      if (block._type === 'block' && 'children' in block && block.children) {
        block.children.forEach((child: { text?: string }) => {
          if (child.text) {
            // 中文按字符数计算，英文按单词数计算
            const chineseChars = (child.text.match(/[\u4e00-\u9fa5]/g) || [])
              .length
            const englishWords = child.text
              .replace(/[\u4e00-\u9fa5]/g, '')
              .split(/\s+/)
              .filter(Boolean).length
            wordCount += chineseChars + englishWords
          }
        })
      } else if ('content' in block && block.content) {
        countWords(block.content as PortableTextElement[])
      }
    })
  }

  countWords(content)

  // 中文阅读速度约300字/分钟，英文约200词/分钟，取平均值250
  return Math.max(1, Math.ceil(wordCount / 250))
}

/**
 * 创建新的Log文档到Sanity CMS
 */
export async function createLogPostInSanity(
  data: CreateLogPostData
): Promise<CreateLogResult> {
  try {
    // 验证管理员权限
    await verifyAdminAccess()

    // 生成slug
    const baseSlug = generateSlug(data.title)
    let slug = baseSlug
    let counter = 1

    // 检查slug是否已存在，如果存在则添加数字后缀
    while (true) {
      const existing = await sanityServerClient.fetch(
        `*[_type == "log" && slug.current == $slug && language == $language][0]`,
        { slug, language: data.language }
      )

      if (!existing) break

      slug = `${baseSlug}-${counter}`
      counter++
    }

    // 估算阅读时间
    const readingTime = estimateReadingTime(data.content)

    // 生成摘要（如果没有提供）
    let excerpt = data.excerpt
    if (!excerpt && data.content.length > 0) {
      // 从第一个段落提取摘要
      const firstBlock = data.content.find((block) => block._type === 'block')
      if (firstBlock && 'children' in firstBlock && firstBlock.children) {
        const text = firstBlock.children
          .map((child: { text?: string }) => child.text || '')
          .join('')
          .trim()
        excerpt = text.substring(0, 200) + (text.length > 200 ? '...' : '')
      }
    }

    // 创建文档数据
    const documentData = {
      _type: 'log',
      _id: nanoid(),
      title: data.title,
      slug: {
        _type: 'slug',
        current: slug,
      },
      content: data.content,
      excerpt,
      language: data.language,
      tags: data.tags || [],
      publishedAt: data.publishedAt || new Date().toISOString(),
      seo: {
        readingTime,
        metaTitle: data.title,
        metaDescription: excerpt,
      },
    }

    // 保存到Sanity
    const result = await sanityServerClient.create(documentData)

    // 清除相关缓存
    revalidateTag('logs')
    revalidateTag(`logs:${data.language}`)
    revalidateTag('log-detail')

    // 生成相关URL
    const studioUrl = `${process.env.NEXT_PUBLIC_SANITY_STUDIO_URL || 'https://your-project.sanity.studio'}/structure/log;${result._id}`
    const frontendUrl = `/${data.language}/log/${slug}`

    return {
      success: true,
      data: {
        _id: result._id,
        slug,
        title: data.title,
        language: data.language,
        studioUrl,
        frontendUrl,
      },
    }
  } catch (error) {
    console.error('创建Sanity文档失败:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : '创建文档失败',
    }
  }
}

/**
 * 获取Sanity Studio配置信息
 */
export async function getSanityStudioConfig() {
  try {
    await verifyAdminAccess()

    return {
      studioUrl:
        process.env.NEXT_PUBLIC_SANITY_STUDIO_URL ||
        'https://your-project.sanity.studio',
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
    }
  } catch {
    throw new Error('获取Sanity配置失败')
  }
}

/**
 * 检查Sanity连接状态
 */
export async function checkSanityConnection(): Promise<{
  connected: boolean
  error?: string
}> {
  try {
    await verifyAdminAccess()

    // 尝试获取一个简单的查询来测试连接
    await sanityServerClient.fetch('*[_type == "log"][0]._id')

    return { connected: true }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : '连接失败',
    }
  }
}
// lib/markdown-actions.ts
// Markdown转换相关的Server Actions

'use server'

import { auth } from '@clerk/nextjs/server'
import {
  markdownToPortableText,
  validatePortableText,
  getConversionStats,
  PortableTextElement,
} from '@/lib/markdown-to-portable-text'
import { isAdmin } from '@/lib/admin-actions'
import { redirect } from 'next/navigation'

// 支持的文件类型
const ALLOWED_TYPES = ['text/markdown', 'text/plain']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface ConversionResult {
  success: boolean
  data?: {
    filename: string
    size: number
    portableText: PortableTextElement[]
    stats: {
      totalBlocks: number
      blockTypes: Record<string, number>
      headings: number
      codeBlocks: number
      images: number
      tables: number
    }
    convertedAt: string
  }
  error?: string
}

/**
 * 检查用户是否有admin权限
 */
async function checkAdminPermission(): Promise<boolean> {
  const { userId } = await auth()

  if (!userId) {
    return false
  }

  // 使用统一的权限检查逻辑
  return await isAdmin()
}

/**
 * 上传并转换Markdown文件
 */
export async function uploadAndConvertMarkdown(
  formData: FormData
): Promise<ConversionResult> {
  try {
    // 验证admin权限
    const hasAdminPermission = await checkAdminPermission()
    if (!hasAdminPermission) {
      return {
        success: false,
        error: '权限不足，需要管理员权限',
      }
    }

    const file = formData.get('file') as File

    if (!file) {
      return {
        success: false,
        error: '未找到文件',
      }
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.md')) {
      return {
        success: false,
        error: '不支持的文件类型，请上传.md文件',
      }
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: '文件过大，最大支持10MB',
      }
    }

    // 读取文件内容
    const content = await file.text()

    if (!content.trim()) {
      return {
        success: false,
        error: '文件内容为空',
      }
    }

    // 转换Markdown为Portable Text
    const portableText = await markdownToPortableText(content)

    // 验证转换结果
    const isValid = validatePortableText(portableText)
    if (!isValid) {
      return {
        success: false,
        error: '转换结果验证失败',
      }
    }

    // 获取转换统计信息
    const stats = getConversionStats(portableText)

    // 返回转换结果
    return {
      success: true,
      data: {
        filename: file.name,
        size: file.size,
        portableText,
        stats,
        convertedAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('Markdown转换失败:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : '转换失败',
    }
  }
}

/**
 * 获取上传配置信息
 */
export async function getUploadConfig() {
  const hasAdminPermission = await checkAdminPermission()

  if (!hasAdminPermission) {
    redirect('/zh/sign-in')
  }

  return {
    maxFileSize: MAX_FILE_SIZE,
    allowedTypes: ALLOWED_TYPES,
    maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
  }
}
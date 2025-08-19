// lib/image-security-utils.ts
// 图片安全工具函数 - 用于双层代理架构的安全验证和处理

import { validateImageAccess, buildSanityImageUrl } from '@/lib/sanity-server'

// 支持的图片格式
export const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'] as const
export const DEFAULT_QUALITY = 75
export const MAX_WIDTH = 3840
export const MAX_HEIGHT = 2160

export type SupportedFormat = typeof SUPPORTED_FORMATS[number]

// 图片参数接口
export interface ImageParams {
  id: string
  width?: number
  height?: number
  quality?: number
  format?: string
}

// 验证结果接口
export interface ValidationResult {
  isValid: boolean
  error?: string
  sanitizedParams?: {
    id: string
    width?: number
    height?: number
    quality: number
    format: SupportedFormat
  }
}

/**
 * 验证图片ID格式
 * @param imageId 图片ID
 * @returns 是否为有效的图片ID
 */
export function isValidImageId(imageId: string): boolean {
  if (!imageId || typeof imageId !== 'string') {
    return false
  }
  
  // 检查是否为有效的Sanity图片ID格式
  // 支持格式: image-{hash}-{dimensions}-{ext} 或 {hash}
  const sanityImagePattern = /^(image-)?[a-f0-9]{40,}(-\d+x\d+)?(-\w+)?$/i
  const isValid = sanityImagePattern.test(imageId)
  
  return isValid
}

/**
 * 提取图片哈希值
 * @param imageId 图片ID
 * @returns 图片哈希值
 */
export function extractImageHash(imageId: string): string {
  if (imageId.startsWith('image-')) {
    // 从完整的资产 ID 中提取哈希部分
    const match = imageId.match(/^image-([a-f0-9]+)-(.+)$/)
    if (match) {
      return match[1]
    }
  }
  return imageId
}

/**
 * 验证和清理图片参数
 * @param params 原始图片参数
 * @returns 验证结果
 */
export async function validateAndSanitizeImageParams(params: ImageParams): Promise<ValidationResult> {
  const { id, width, height, quality = DEFAULT_QUALITY, format = 'webp' } = params
  
  // 验证图片ID
  if (!isValidImageId(id)) {
    return {
      isValid: false,
      error: 'Invalid image ID format'
    }
  }
  
  // 验证格式
  if (!SUPPORTED_FORMATS.includes(format.toLowerCase() as SupportedFormat)) {
    return {
      isValid: false,
      error: `Unsupported image format: ${format}`
    }
  }
  
  // 验证宽度
  if (width !== undefined && (width <= 0 || width > MAX_WIDTH)) {
    return {
      isValid: false,
      error: `Invalid width: ${width}. Must be between 1 and ${MAX_WIDTH}`
    }
  }
  
  // 验证高度
  if (height !== undefined && (height <= 0 || height > MAX_HEIGHT)) {
    return {
      isValid: false,
      error: `Invalid height: ${height}. Must be between 1 and ${MAX_HEIGHT}`
    }
  }
  
  // 验证质量
  if (quality < 1 || quality > 100) {
    return {
      isValid: false,
      error: `Invalid quality: ${quality}. Must be between 1 and 100`
    }
  }
  
  // 验证访问权限
  const imageHash = extractImageHash(id)
  const hasAccess = await validateImageAccess(imageHash)
  if (!hasAccess) {
    return {
      isValid: false,
      error: 'Access denied'
    }
  }
  
  return {
    isValid: true,
    sanitizedParams: {
      id,
      width,
      height,
      quality,
      format: format.toLowerCase() as SupportedFormat
    }
  }
}

/**
 * 获取安全的图片数据
 * @param params 已验证的图片参数
 * @returns 图片响应数据
 */
export async function fetchSecureImageData(params: {
  id: string
  width?: number
  height?: number
  quality: number
  format: SupportedFormat
}) {
  const { id, width, height, quality, format } = params
  
  // 构建 Sanity CDN URL
  const sanityUrl = buildSanityImageUrl(id, width, height, quality, format)
  
  // 代理请求到 Sanity CDN
  const response = await fetch(sanityUrl, {
    headers: {
      'User-Agent': 'Digital-Garden-Proxy/2.0',
    },
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
  }
  
  return response
}

/**
 * 生成安全的缓存头
 * @param contentType 内容类型
 * @returns 响应头对象
 */
export function generateSecureHeaders(contentType: string): Headers {
  return new Headers({
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'CDN-Cache-Control': 'public, max-age=31536000',
    'Vercel-CDN-Cache-Control': 'public, max-age=31536000',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Robots-Tag': 'noindex, nofollow',
  })
}

/**
 * 生成图片的ETag
 * @param imageId 图片ID
 * @param params 图片参数
 * @returns ETag字符串
 */
export function generateImageETag(imageId: string, params: {
  width?: number
  height?: number
  quality: number
  format: string
}): string {
  const { width, height, quality, format } = params
  const paramString = `${width || 'auto'}x${height || 'auto'}_q${quality}_${format}`
  return `"${imageId}-${paramString}"`
}
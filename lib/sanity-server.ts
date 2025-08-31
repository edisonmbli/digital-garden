// lib/sanity-server.ts
// 服务端专用的 Sanity 客户端，不暴露敏感信息给客户端
import 'server-only'
import { createClient } from 'next-sanity'

// 服务端环境变量（不使用 NEXT_PUBLIC_ 前缀）
const projectId =
  process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset =
  process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET
const apiVersion =
  process.env.SANITY_API_VERSION ||
  process.env.NEXT_PUBLIC_SANITY_API_VERSION ||
  '2023-05-03'
// 注意：Sanity free plan 不需要 token，只有访问私有内容时才需要

if (!projectId || !dataset) {
  throw new Error('Missing required Sanity environment variables')
}

// 服务端 Sanity 客户端（只读，包含完整配置）
export const sanityServerClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // 使用 CDN 提高性能，图片代理只是隐藏项目信息，不改变CDN性质
  token: undefined, // free plan 不需要 token
})

// 服务端 Sanity 客户端（编辑权限）
export const sanityServerClientWithToken = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // 写操作不使用 CDN
  token: process.env.SANITY_API_EDITOR_TOKEN, // 编辑权限 token
  // 增加超时时间
  timeout: 30000, // 30秒
  // 添加重试配置
  retryDelay: (attemptNumber: number) => Math.min(1000 * Math.pow(2, attemptNumber), 30000),
  maxRetries: 3,
})

// 导出配置供其他服务端模块使用
export const sanityConfig = {
  projectId,
  dataset,
  apiVersion,
}

// 从 Sanity 图片 URL 中提取图片 ID 的工具函数
export function extractImageId(sanityUrl: string): string {
  // Sanity 图片 URL 格式: https://cdn.sanity.io/images/{projectId}/{dataset}/{imageId}-{width}x{height}-{format}
  const match = sanityUrl.match(/\/([a-f0-9]+)-\d+x\d+-\w+$/)
  return match ? match[1] : ''
}

// 构建 Sanity 图片 URL 的工具函数
export function buildSanityImageUrl(
  imageId: string,
  width?: number,
  height?: number,
  quality?: number,
  format?: string
): string {
  if (!projectId || !dataset) {
    throw new Error('Missing Sanity configuration')
  }

  let url: string

  // If imageId starts with 'image-', it's a full asset ID
  if (imageId.startsWith('image-')) {
    // Parse the full asset ID: image-{hash}-{width}x{height}-{format}
    const match = imageId.match(/^image-([a-f0-9]+)-(\d+)x(\d+)-(\w+)$/)
    if (match) {
      const [, hash, originalWidth, originalHeight, originalFormat] = match
      url = `https://cdn.sanity.io/images/${projectId}/${dataset}/${hash}-${originalWidth}x${originalHeight}.${originalFormat}`
    } else {
      throw new Error(`Invalid Sanity asset ID format: ${imageId}`)
    }
  } else {
    // Just a hash, use it directly (for backward compatibility)
    url = `https://cdn.sanity.io/images/${projectId}/${dataset}/${imageId}`
  }

  const params = new URLSearchParams()
  if (width) params.append('w', width.toString())
  if (height) params.append('h', height.toString())
  if (quality) params.append('q', quality.toString())
  if (format) params.append('fm', format)

  if (params.toString()) {
    url += `?${params.toString()}`
  }

  return url
}

// 验证图片访问权限的函数（可根据需要扩展）
export async function validateImageAccess(imageId: string): Promise<boolean> {
  // 基础验证：检查图片 ID 格式
  if (!/^[a-f0-9]+$/.test(imageId)) {
    return false
  }

  // 可以在这里添加更多验证逻辑：
  // - 检查用户权限
  // - 验证图片是否存在
  // - 检查访问频率限制

  return true
}

// 获取图片元数据的函数
export async function getImageMetadata(imageId: string) {
  try {
    const imageData = await sanityServerClient.fetch(`
      *[_type == "sanity.imageAsset" && _id == "image-${imageId}"][0] {
        _id,
        originalFilename,
        size,
        metadata {
          dimensions {
            width,
            height
          },
          hasAlpha,
          isOpaque
        }
      }
    `)

    return imageData
  } catch (error) {
    console.error('Failed to fetch image metadata:', error)
    return null
  }
}

// lib/secure-image-loader.ts
// 安全图片处理工具函数
// 
// 提供 Sanity 图片 ID 提取和安全 URL 生成功能

/**
 * 从 Sanity URL 中提取图片 ID 的工具函数
 */
export function extractSanityImageId(sanityUrl: string): string {
  // 处理不同格式的 Sanity URL
  const patterns = [
    // 标准格式: https://cdn.sanity.io/images/{projectId}/{dataset}/{imageId}-{width}x{height}-{format}
    /\/([a-f0-9]+)-\d+x\d+-\w+$/,
    // 无尺寸格式: https://cdn.sanity.io/images/{projectId}/{dataset}/{imageId}
    /\/([a-f0-9]+)$/,
    // 带参数格式: https://cdn.sanity.io/images/{projectId}/{dataset}/{imageId}?{params}
    /\/([a-f0-9]+)\?/,
  ]
  
  for (const pattern of patterns) {
    const match = sanityUrl.match(pattern)
    if (match) {
      return match[1]
    }
  }
  
  // 如果都不匹配，返回原始字符串（可能已经是 ID）
  return sanityUrl
}

/**
 * 检查是否为 Sanity 图片 URL
 */
export function isSanityImageUrl(url: string): boolean {
  return url.includes('cdn.sanity.io/images/') || /^[a-f0-9]{40,}$/.test(url)
}

/**
 * 为 Sanity 图片生成安全的代理 URL
 */
export function generateSecureImageUrl(
  imageId: string,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'avif' | 'jpg' | 'png'
  } = {}
): string {
  const { width, height, quality = 75, format = 'webp' } = options
  
  const params = new URLSearchParams()
  
  if (width) params.set('w', width.toString())
  if (height) params.set('h', height.toString())
  params.set('q', quality.toString())
  params.set('fm', format)
  
  const queryString = params.toString()
  return `/api/images/secure/${imageId}${queryString ? `?${queryString}` : ''}`
}
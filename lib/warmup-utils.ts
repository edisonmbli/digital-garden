import { getAllCollections, getHeroCollections } from '@/lib/dal'
import { sanityServerClient } from '@/lib/sanity-server'
import { groq } from 'next-sanity'
import { extractSanityImageId } from '@/lib/secure-image-loader'

/**
 * 获取需要预热的图片 ID 列表
 * @param type 图片类型：'all' | 'collections' | 'photos' | 'dev-collections'
 * @param limit 限制数量，默认 50
 * @returns 图片 ID 数组
 */
export async function getWarmupImageIds(
  type: 'all' | 'collections' | 'photos' | 'dev-collections' = 'all',
  limit: number = 50
): Promise<string[]> {
  const imageIds: string[] = []
  
  try {
    // 获取合集封面图片
    if (type === 'all' || type === 'collections') {
      try {
        const collections = await getAllCollections()
        const heroCollections = await getHeroCollections() // 获取英雄合集
        
        // 合并所有合集
        const allCollections = [...collections, ...heroCollections]
        
        for (const collection of allCollections) {
          if (collection.coverImage) {
            let imageId: string | null = null
            
            if (typeof collection.coverImage === 'object' && 'asset' in collection.coverImage && collection.coverImage.asset) {
              imageId = collection.coverImage.asset._ref
            } else if (typeof collection.coverImage === 'string') {
              imageId = extractSanityImageId(collection.coverImage)
            }
            
            if (imageId && !imageIds.includes(imageId)) {
              imageIds.push(imageId)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching collections for warmup:', error)
      }
    }
    
    // 获取热门照片
    if (type === 'all' || type === 'photos') {
      try {
        const query = groq`*[_type == "photo"] | order(_createdAt desc) [0...${limit}] {
          _id,
          imageFile
        }`
        
        const photos = await sanityServerClient.fetch(query)
        
        for (const photo of photos) {
          if (photo.imageFile) {
            let imageId: string | null = null
            
            if (typeof photo.imageFile === 'object' && 'asset' in photo.imageFile && photo.imageFile.asset) {
              imageId = photo.imageFile.asset._ref
            } else if (typeof photo.imageFile === 'string') {
              imageId = extractSanityImageId(photo.imageFile)
            }
            
            if (imageId && !imageIds.includes(imageId)) {
              imageIds.push(imageId)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching photos for warmup:', error)
      }
    }
    
    // 获取开发合集封面
    if (type === 'all' || type === 'dev-collections') {
      try {
        const query = groq`*[_type == "devCollection"] {
          _id,
          coverImage
        }`
        
        const devCollections = await sanityServerClient.fetch(query)
        
        for (const collection of devCollections) {
          if (collection.coverImage) {
            let imageId: string | null = null
            
            if (typeof collection.coverImage === 'object' && 'asset' in collection.coverImage && collection.coverImage.asset) {
              imageId = collection.coverImage.asset._ref
            } else if (typeof collection.coverImage === 'string') {
              imageId = extractSanityImageId(collection.coverImage)
            }
            
            if (imageId && !imageIds.includes(imageId)) {
              imageIds.push(imageId)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching dev collections for warmup:', error)
      }
    }
    
    console.log(`[Warmup Utils] Generated ${imageIds.length} image IDs for type: ${type}`, {
      type,
      limit,
      imageCount: imageIds.length,
      timestamp: new Date().toISOString()
    })
    
    return imageIds
    
  } catch (error) {
    console.error('Error in getWarmupImageIds:', error)
    return []
  }
}

/**
 * 生成预热 URL 列表
 * @param baseUrl 基础 URL
 * @param imageIds 图片 ID 数组
 * @param sizes 图片尺寸数组，默认 [640, 828, 1200]
 * @param formats 图片格式数组，默认 ['webp']
 * @returns 预热 URL 数组
 */
export function generateWarmupUrls(
  baseUrl: string,
  imageIds: string[],
  sizes: number[] | string[] = [640, 828, 1200],
  formats: string[] = ['webp']
): string[] {
  const urls: string[] = []
  
  imageIds.forEach(imageId => {
    sizes.forEach(size => {
      formats.forEach(format => {
        // 支持字符串和数字类型的尺寸
        const sizeStr = typeof size === 'string' ? size : size.toString()
        urls.push(`${baseUrl}/api/images/secure/${imageId}?w=${sizeStr}&q=75&fm=${format}`)
      })
    })
  })
  
  return urls
}

// 管理员预热配置类型
type AdminWarmupConfig = {
  type: 'collection-covers' | 'featured-photos' | 'dev-collections' | 'custom'
  limit: number
  sizes: string[]
  formats: string[]
  customImageIds?: string[]
}

// 原有函数重载（保持向后兼容）
export async function performImageWarmup(
  baseUrl: string,
  type: 'all' | 'collections' | 'photos' | 'dev-collections',
  limit: number,
  concurrency: number
): Promise<{ total: number; success: number; failed: number; errors: string[] } | { message: string; total: number; success: number; failed: number; errors: string[] }>

// 新的管理员配置重载
export async function performImageWarmup(
  config: AdminWarmupConfig
): Promise<{ total: number; success: number; failed: number; errors: string[] } | { message: string; total: number; success: number; failed: number; errors: string[] }>

/**
 * 执行图片预热
 * @param baseUrlOrConfig 基础 URL 或管理员配置
 * @param type 预热类型
 * @param limit 图片数量限制
 * @param concurrency 并发数，默认 3
 * @returns 预热结果
 */
export async function performImageWarmup(
  baseUrlOrConfig: string | AdminWarmupConfig,
  type: 'all' | 'collections' | 'photos' | 'dev-collections' = 'all',
  limit: number = 50,
  concurrency: number = 3
) {
  const results = {
    total: 0,
    success: 0,
    failed: 0,
    errors: [] as string[]
  }
  
  try {
    let imageIds: string[]
    let warmupUrls: string[]
    
    // 判断是否为管理员配置
    if (typeof baseUrlOrConfig === 'object') {
      const config = baseUrlOrConfig
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'
      
      if (config.type === 'custom' && config.customImageIds) {
        imageIds = config.customImageIds
      } else {
        // 映射管理员类型到内部类型
        const internalType = config.type === 'collection-covers' ? 'collections' 
          : config.type === 'featured-photos' ? 'photos'
          : config.type === 'dev-collections' ? 'dev-collections'
          : 'all'
        imageIds = await getWarmupImageIds(internalType, config.limit)
      }
      
      warmupUrls = generateWarmupUrls(baseUrl, imageIds, config.sizes, config.formats)
    } else {
      // 原有逻辑（向后兼容）
      const baseUrl = baseUrlOrConfig
      imageIds = await getWarmupImageIds(type, limit)
      warmupUrls = generateWarmupUrls(baseUrl, imageIds)
    }
    
    if (imageIds.length === 0) {
      return { ...results, message: 'No images to warmup' }
    }
    
    results.total = warmupUrls.length
    
    console.log(`[Warmup] Generated ${warmupUrls.length} URLs for ${imageIds.length} images`)
    
    // 并发执行预热请求
    for (let i = 0; i < warmupUrls.length; i += concurrency) {
      const batch = warmupUrls.slice(i, i + concurrency)
      
      const batchPromises = batch.map(async (url) => {
        try {
          const response = await fetch(url, {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Warmup-Internal/1.0'
            },
            signal: AbortSignal.timeout(8000) // 8秒超时
          })
          
          if (response.ok) {
            results.success++
          } else {
            results.failed++
            results.errors.push(`${url}: HTTP ${response.status}`)
          }
        } catch (error) {
          results.failed++
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`${url}: ${errorMsg}`)
        }
      })
      
      await Promise.all(batchPromises)
      
      // 批次间短暂延迟
      if (i + concurrency < warmupUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    
    return results
    
  } catch (error) {
    results.errors.push(error instanceof Error ? error.message : 'Unknown error')
    return results
  }
}
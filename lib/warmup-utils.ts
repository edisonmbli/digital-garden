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
export type AdminWarmupConfig = {
  type: 'cover-images' | 'collection' | 'dev-collections' | 'custom'
  limit: number
  sizes: string[]
  formats: string[]
  customImageIds?: string[]
  targetId?: string // 用于指定特定的collection ID
}

// 预热进度回调类型
export type WarmupProgressCallback = (progress: {
  current: number
  total: number
  currentUrl: string
  status: 'processing' | 'success' | 'error'
  message?: string
}) => void

// 预热结果类型
export type WarmupResult = {
  success: boolean
  totalUrls: number
  successCount: number
  failureCount: number
  duration: number
  errors: string[]
}

// 生成图片URL的辅助函数
function generateImageUrl(imageId: string, width: number, format: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'
  return `${baseUrl}/api/images/secure/${imageId}?w=${width}&q=75&fm=${format}`
}

// 性能优化：URL去重和缓存检查
function optimizeWarmupUrls(urls: string[]): string[] {
  // 去除重复URL
  const uniqueUrls = Array.from(new Set(urls))
  
  console.log(`URL优化: 原始${urls.length}个，去重后${uniqueUrls.length}个`)
  
  return uniqueUrls
}

// 性能优化：批次大小动态调整策略
function calculateOptimalBatchSize(totalUrls: number, avgResponseTime: number): number {
  // 基础批次大小
  let batchSize = 20
  
  // 根据总URL数量调整
  if (totalUrls > 1000) {
    batchSize = 30 // 大量URL时增加批次大小
  } else if (totalUrls < 100) {
    batchSize = 10 // 少量URL时减少批次大小
  }
  
  // 根据平均响应时间调整
  if (avgResponseTime > 2000) {
    batchSize = Math.max(5, Math.floor(batchSize * 0.6)) // 响应慢时减少批次
  } else if (avgResponseTime < 500) {
    batchSize = Math.min(50, Math.floor(batchSize * 1.5)) // 响应快时增加批次
  }
  
  return batchSize
}

// 新增：获取预热目标的图片ID和数量
export async function getWarmupTargetInfo(config: AdminWarmupConfig): Promise<{
  imageIds: string[]
  totalCount: number
  description: string
}> {
  const { type, targetId, customImageIds } = config
  
  switch (type) {
    case 'cover-images': {
      const collections = await getAllCollections()
      const imageIds: string[] = []
      
      // 只获取普通collection封面
      for (const collection of collections) {
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
      
      return {
        imageIds,
        totalCount: imageIds.length,
        description: `合集封面图片 (${imageIds.length}张)`
      }
    }
    
    case 'collection': {
      if (!targetId) {
        throw new Error('Collection type requires targetId')
      }
      
      const query = groq`*[_type == "collection" && _id == $targetId][0] {
        _id,
        "name": name,
        "photos": photos[]-> {
          _id,
          imageFile
        }
      }`
      
      const collection = await sanityServerClient.fetch(query, { targetId })
      if (!collection) {
        throw new Error('Collection not found')
      }
      
      const imageIds: string[] = []
      for (const photo of collection.photos || []) {
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
      
      return {
        imageIds,
        totalCount: imageIds.length,
        description: `${collection.name?.zh || collection.name?.en || 'Unknown'} 合集照片 (${imageIds.length}张)`
      }
    }
    
    case 'dev-collections': {
      // 获取所有dev collection关联的log文章的mainImage
      const query = groq`*[_type == "devCollection"] {
        _id,
        "name": name,
        "logs": logs[]-> {
          _id,
          mainImage
        }
      }`
      
      const devCollections = await sanityServerClient.fetch(query)
      const imageIds: string[] = []
      
      for (const devCollection of devCollections) {
        if (devCollection.logs) {
          for (const log of devCollection.logs) {
            if (log.mainImage) {
              let imageId: string | null = null
              if (typeof log.mainImage === 'object' && 'asset' in log.mainImage && log.mainImage.asset) {
                imageId = log.mainImage.asset._ref
              } else if (typeof log.mainImage === 'string') {
                imageId = extractSanityImageId(log.mainImage)
              }
              if (imageId && !imageIds.includes(imageId)) {
                imageIds.push(imageId)
              }
            }
          }
        }
      }
      
      return {
        imageIds,
        totalCount: imageIds.length,
        description: `开发合集文章主图 (${imageIds.length}张)`
      }
    }
    
    case 'custom': {
      const imageIds = customImageIds || []
      return {
        imageIds,
        totalCount: imageIds.length,
        description: `自定义图片ID (${imageIds.length}张)`
      }
    }
    
    default:
      throw new Error(`Unsupported warmup type: ${type}`)
  }
}

// 智能批次预热函数（支持进度回调）
export async function performImageWarmupWithProgress(
  config: AdminWarmupConfig,
  progressCallback?: WarmupProgressCallback,
  initialBatchSize: number = 20
): Promise<WarmupResult> {
  const startTime = Date.now()
  
  try {
    // 获取目标信息
    const targetInfo = await getWarmupTargetInfo(config)
    const { imageIds } = targetInfo
    
    if (imageIds.length === 0) {
      return {
        success: true,
        totalUrls: 0,
        successCount: 0,
        failureCount: 0,
        duration: Date.now() - startTime,
        errors: []
      }
    }
    
    // 生成所有预热URL
    const allUrls: string[] = []
    for (const imageId of imageIds) {
      for (const size of config.sizes) {
        for (const format of config.formats) {
          const url = generateImageUrl(imageId, parseInt(size), format)
          allUrls.push(url)
        }
      }
    }
    
    // 性能优化：去重和优化URL列表
    const warmupUrls = optimizeWarmupUrls(allUrls)
    
    console.log(`开始智能批次预热 ${warmupUrls.length} 个图片URL，初始批次大小: ${initialBatchSize}...`)
    
    const errors: string[] = []
    let successCount = 0
    let processedCount = 0
    let currentBatchSize = initialBatchSize
    let consecutiveSuccesses = 0
    let consecutiveFailures = 0
    let totalResponseTime = 0
    let responseCount = 0
    
    // 智能批次处理
    let i = 0
    while (i < warmupUrls.length) {
      // 动态计算最优批次大小
      const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 1000
      const optimalBatchSize = calculateOptimalBatchSize(warmupUrls.length, avgResponseTime)
      
      // 使用计算出的最优批次大小，但不超过当前设定的批次大小
      const effectiveBatchSize = Math.min(currentBatchSize, optimalBatchSize)
      
      const batch = warmupUrls.slice(i, i + effectiveBatchSize)
      const batchStartTime = Date.now()
      
      console.log(`处理批次 ${Math.floor(i / initialBatchSize) + 1}，批次大小: ${effectiveBatchSize}，剩余: ${warmupUrls.length - i}，平均响应时间: ${avgResponseTime.toFixed(0)}ms`)
      
      // 处理当前批次
      const batchResults = await Promise.allSettled(
        batch.map(async (url, batchIndex) => {
          const urlStartTime = Date.now()
          
          progressCallback?.({
            current: processedCount + batchIndex + 1,
            total: warmupUrls.length,
            currentUrl: url,
            status: 'processing'
          })
          
          try {
            // 利用Next.js原生fetch+cache机制优化性能
            const response = await fetch(url, { 
              method: 'HEAD',
              headers: {
                'User-Agent': 'Warmup-Bot/1.0',
                'Cache-Control': 'public, max-age=31536000', // 1年缓存
                'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8'
              },
              // 添加超时控制
              signal: AbortSignal.timeout(10000), // 10秒超时
              // 利用Next.js缓存机制
               next: { 
                 revalidate: 3600, // 1小时重新验证
                 tags: [`warmup-${url.split('/').pop()?.split('?')[0] || 'unknown'}`, 'image-warmup']
               },
              // 启用缓存
              cache: 'force-cache'
            })
            
            const urlDuration = Date.now() - urlStartTime
            
            // 更新响应时间统计
            totalResponseTime += urlDuration
            responseCount++
            
            if (response.ok) {
              progressCallback?.({
                current: processedCount + batchIndex + 1,
                total: warmupUrls.length,
                currentUrl: url,
                status: 'success',
                message: `${urlDuration}ms`
              })
              return { success: true, url, duration: urlDuration }
            } else {
              const error = `Status ${response.status}`
              progressCallback?.({
                current: processedCount + batchIndex + 1,
                total: warmupUrls.length,
                currentUrl: url,
                status: 'error',
                message: error
              })
              return { success: false, url, error, duration: urlDuration }
            }
          } catch (fetchError) {
            const urlDuration = Date.now() - urlStartTime
            const error = fetchError instanceof Error ? fetchError.message : 'Network error'
            progressCallback?.({
              current: processedCount + batchIndex + 1,
              total: warmupUrls.length,
              currentUrl: url,
              status: 'error',
              message: error
            })
            return { success: false, url, error, duration: urlDuration }
          }
        })
      )
      
      // 统计批次结果
        let batchSuccessCount = 0
        let totalBatchDuration = 0
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            totalBatchDuration += result.value.duration || 0
            if (result.value.success) {
              batchSuccessCount++
              successCount++
            } else {
              errors.push(`URL ${result.value.url} failed: ${result.value.error}`)
            }
          } else {
            errors.push(`URL ${batch[index]} failed: ${result.reason}`)
          }
        })
      
      processedCount += batch.length
      const batchDuration = Date.now() - batchStartTime
      const avgUrlDuration = totalBatchDuration / batch.length
      
      console.log(`批次完成: 成功 ${batchSuccessCount}/${batch.length}，平均用时 ${avgUrlDuration.toFixed(0)}ms/URL，批次总用时 ${batchDuration}ms`)
      
      // 智能调整批次大小
      const batchSuccessRate = batchSuccessCount / batch.length
      
      if (batchSuccessRate >= 0.9) {
        // 成功率高，可以增加批次大小
        consecutiveSuccesses++
        consecutiveFailures = 0
        
        if (consecutiveSuccesses >= 2 && currentBatchSize < 50) {
          currentBatchSize = Math.min(currentBatchSize + 5, 50)
          console.log(`连续成功，增加批次大小到: ${currentBatchSize}`)
          consecutiveSuccesses = 0
        }
      } else if (batchSuccessRate < 0.7) {
        // 成功率低，减少批次大小
        consecutiveFailures++
        consecutiveSuccesses = 0
        
        if (consecutiveFailures >= 1 && currentBatchSize > 5) {
          currentBatchSize = Math.max(currentBatchSize - 5, 5)
          console.log(`成功率低，减少批次大小到: ${currentBatchSize}`)
        }
      } else {
        // 成功率中等，保持当前批次大小
        consecutiveSuccesses = 0
        consecutiveFailures = 0
      }
      
      // 移动到下一批次
      i += batch.length
      
      // 批次间智能延迟
      if (i < warmupUrls.length) {
        let delay = 100 // 基础延迟
        
        // 根据平均响应时间调整延迟
        if (avgUrlDuration > 2000) {
          delay = 500 // 响应慢时增加延迟
        } else if (avgUrlDuration < 500) {
          delay = 50 // 响应快时减少延迟
        }
        
        // 根据失败率调整延迟
        if (batchSuccessRate < 0.8) {
          delay *= 2 // 失败率高时增加延迟
        }
        
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    // 最终进度回调 - 确保进度条显示100%
    if (progressCallback) {
      progressCallback({
        current: warmupUrls.length,
        total: warmupUrls.length,
        currentUrl: '预热完成',
        status: errors.length === 0 ? 'success' : 'error',
        message: errors.length === 0 ? '所有图片预热完成' : `预热完成，${errors.length} 个失败`
      })
    }
    
    const duration = Date.now() - startTime
    
    return {
      success: errors.length === 0,
      totalUrls: warmupUrls.length,
      successCount,
      failureCount: warmupUrls.length - successCount,
      duration,
      errors
    }
    
  } catch (error) {
    console.error('智能批次预热过程中发生错误:', error)
    return {
      success: false,
      totalUrls: 0,
      successCount: 0,
      failureCount: 0,
      duration: Date.now() - startTime,
      errors: [error instanceof Error ? error.message : String(error)]
    }
  }
}

// 新的管理员预热函数（支持配置对象）
export async function performImageWarmup(
  config: AdminWarmupConfig
): Promise<WarmupResult>
export async function performImageWarmup(
  type: string,
  limit: number,
  sizes: string[],
  formats: string[],
  customImageIds?: string[]
): Promise<WarmupResult>
export async function performImageWarmup(
  configOrType: AdminWarmupConfig | string,
  limit?: number,
  sizes?: string[],
  formats?: string[],
  customImageIds?: string[]
): Promise<WarmupResult> {
  let config: AdminWarmupConfig
  
  if (typeof configOrType === 'string') {
    // 旧的函数签名，保持向后兼容
    config = {
      type: configOrType as AdminWarmupConfig['type'],
      limit: limit || 10,
      sizes: sizes || ['400', '800'],
      formats: formats || ['webp'],
      customImageIds
    }
  } else {
    config = configOrType
  }
  
  // 使用新的智能批次预热函数
  return performImageWarmupWithProgress(config)
}

// 原有函数重载（保持向后兼容）
export async function performImageWarmupLegacy(
  baseUrl: string,
  type: 'all' | 'collections' | 'photos' | 'dev-collections',
  limit: number,
  concurrency: number
): Promise<{ total: number; success: number; failed: number; errors: string[] } | { message: string; total: number; success: number; failed: number; errors: string[] }>

/**
 * 执行图片预热（旧版本，保持向后兼容）
 * @param baseUrlOrConfig 基础 URL 或管理员配置
 * @param type 预热类型
 * @param limit 图片数量限制
 * @param concurrency 并发数，默认 3
 * @returns 预热结果
 */
export async function performImageWarmupLegacy(
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
        const internalType = config.type === 'cover-images' ? 'collections' 
          : config.type === 'collection' ? 'photos'
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
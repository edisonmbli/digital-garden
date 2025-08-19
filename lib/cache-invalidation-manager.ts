// lib/cache-invalidation-manager.ts
import { revalidateTag, revalidatePath } from 'next/cache'
import { logger } from './logger'
import { ContentRelationshipMapper } from './content-relationship-mapper'
import type { SanityDocument as SanityClientDocument } from '@sanity/client'

// 文档类型定义
interface SanityDocument {
  _id: string
  _type: string
  slug?: { current: string }
  language?: string
  [key: string]: unknown
}

// 基础文档类型定义，支持所有 Sanity 文档类型

// 内容关联关系配置
const CONTENT_RELATIONSHIPS = {
  collection: {
    affects: ['collections', 'gallery', 'homepage'],
    relatedQueries: ['getHeroCollections', 'getAllCollections', 'getCollectionAndPhotosBySlug'],
    paths: (doc: SanityDocument) => {
      const paths = ['/gallery', '/', '/zh', '/en']
      if (doc.slug?.current) {
        paths.push(`/gallery/${doc.slug.current}`)
        paths.push(`/zh/gallery/${doc.slug.current}`)
        paths.push(`/en/gallery/${doc.slug.current}`)
      }
      return paths
    },
    tags: (doc: SanityDocument) => [
      'collections',
      `collection:${doc._id}`,
      ...(doc.slug?.current ? [`collection:${doc.slug.current}`] : []),
      'homepage-collections'
    ]
  },
  photo: {
    affects: ['photos', 'collections', 'gallery'],
    relatedQueries: ['getCollectionAndPhotosBySlug'],
    paths: (doc: SanityDocument, relatedCollections: SanityDocument[] = []) => {
      const paths = ['/gallery']
      relatedCollections.forEach(collection => {
        if (collection.slug?.current) {
          paths.push(`/gallery/${collection.slug.current}`)
          paths.push(`/zh/gallery/${collection.slug.current}`)
          paths.push(`/en/gallery/${collection.slug.current}`)
        }
      })
      return paths
    },
    tags: (doc: SanityDocument, relatedCollections: SanityDocument[] = []) => [
      'photos',
      `photo:${doc._id}`,
      ...relatedCollections.map(c => `collection:${c._id}`),
      ...relatedCollections.map(c => c.slug?.current ? `collection:${c.slug.current}` : '').filter(Boolean)
    ]
  },
  log: {
    affects: ['logs', 'devCollections'],
    relatedQueries: ['getLogPosts', 'getLogPostBySlug', 'getAllDevCollectionsAndLogs'],
    paths: (doc: SanityDocument) => {
      const paths = ['/log', '/zh/log', '/en/log']
      if (doc.slug?.current) {
        paths.push(`/log/${doc.slug.current}`)
        paths.push(`/zh/log/${doc.slug.current}`)
        paths.push(`/en/log/${doc.slug.current}`)
      }
      return paths
    },
    tags: (doc: SanityDocument) => [
      'logs',
      `log:${doc._id}`,
      ...(doc.slug?.current ? [`log:${doc.slug.current}`] : []),
      ...(doc.language ? [`logs:${doc.language}`] : [])
    ]
  },
  devCollection: {
    affects: ['devCollections', 'logs'],
    relatedQueries: ['getAllDevCollectionsAndLogs', 'getDevCollectionBySlug'],
    paths: (doc: SanityDocument) => {
      const paths = ['/log', '/zh/log', '/en/log']
      if (doc.slug?.current) {
        paths.push(`/log/collection/${doc.slug.current}`)
        paths.push(`/zh/log/collection/${doc.slug.current}`)
        paths.push(`/en/log/collection/${doc.slug.current}`)
      }
      return paths
    },
    tags: (doc: SanityDocument) => [
      'devCollections',
      `devCollection:${doc._id}`,
      ...(doc.slug?.current ? [`devCollection:${doc.slug.current}`] : [])
    ]
  },
  author: {
    affects: ['authors', 'logs'],
    relatedQueries: ['getAuthorBySlug'],
    paths: (doc: SanityDocument) => {
      const paths: string[] = []
      if (doc.slug?.current) {
        paths.push(`/author/${doc.slug.current}`)
        paths.push(`/zh/author/${doc.slug.current}`)
        paths.push(`/en/author/${doc.slug.current}`)
      }
      return paths
    },
    tags: (doc: SanityDocument) => [
      'authors',
      'author-data', // 保持与现有代码的兼容性
      `author:${doc._id}`,
      ...(doc.slug?.current ? [`author:${doc.slug.current}`] : [])
    ]
  }
} as const

// 缓存失效任务接口
export interface CacheInvalidationTask {
  type: keyof typeof CONTENT_RELATIONSHIPS
  operation: 'create' | 'update' | 'delete'
  documentId: string
  beforeState?: SanityDocument
  afterState?: SanityDocument
  relatedData?: SanityDocument[]
}

// 缓存失效管理器
export class CacheInvalidationManager {
  private static instance: CacheInvalidationManager
  private invalidationQueue: CacheInvalidationTask[] = []
  private batchTimeout: NodeJS.Timeout | null = null
  private readonly BATCH_DELAY = 100 // 100ms 批量延迟

  static getInstance(): CacheInvalidationManager {
    if (!CacheInvalidationManager.instance) {
      CacheInvalidationManager.instance = new CacheInvalidationManager()
    }
    return CacheInvalidationManager.instance
  }

  /**
   * 队列化缓存失效任务（支持批量处理）
   */
  async queueInvalidation(task: CacheInvalidationTask): Promise<void> {
    this.invalidationQueue.push(task)
    
    logger.debug('CacheInvalidation', '缓存失效任务已加入队列', {
      type: task.type,
      operation: task.operation,
      documentId: task.documentId,
      queueLength: this.invalidationQueue.length
    })

    // 延迟批量处理
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatch()
    }, this.BATCH_DELAY)
  }

  /**
   * 立即执行缓存失效（不使用批量处理）
   */
  async invalidateImmediately(task: CacheInvalidationTask): Promise<void> {
    try {
      await this.executeInvalidation(task)
      logger.info('CacheInvalidation', '立即缓存失效完成', {
        type: task.type,
        operation: task.operation,
        documentId: task.documentId
      })
    } catch (error) {
      logger.error('CacheInvalidation', '立即缓存失效失败', error as Error, {
        type: task.type,
        operation: task.operation,
        documentId: task.documentId
      })
      throw error
    }
  }

  /**
   * 处理批量缓存失效
   */
  private async processBatch(): Promise<void> {
    if (this.invalidationQueue.length === 0) return

    const tasks = [...this.invalidationQueue]
    this.invalidationQueue = []
    this.batchTimeout = null

    logger.info('CacheInvalidation', '开始处理批量缓存失效', {
      taskCount: tasks.length
    })

    try {
      // 合并重复的任务
      const mergedTasks = this.mergeTasks(tasks)
      
      // 并行执行失效操作
      await Promise.all(mergedTasks.map(task => this.executeInvalidation(task)))
      
      logger.info('CacheInvalidation', '批量缓存失效完成', {
        originalTaskCount: tasks.length,
        mergedTaskCount: mergedTasks.length
      })
    } catch (error) {
      logger.error('CacheInvalidation', '批量缓存失效失败', error as Error, {
        taskCount: tasks.length
      })
    }
  }

  /**
   * 合并重复的缓存失效任务
   */
  private mergeTasks(tasks: CacheInvalidationTask[]): CacheInvalidationTask[] {
    const taskMap = new Map<string, CacheInvalidationTask>()

    for (const task of tasks) {
      const key = `${task.type}:${task.documentId}`
      const existing = taskMap.get(key)

      if (!existing) {
        taskMap.set(key, task)
      } else {
        // 合并任务，保留最新的状态
        taskMap.set(key, {
          ...existing,
          operation: task.operation,
          afterState: task.afterState || existing.afterState,
          relatedData: task.relatedData || existing.relatedData
        })
      }
    }

    return Array.from(taskMap.values())
  }

  /**
   * 执行单个缓存失效任务
   */
  private async executeInvalidation(task: CacheInvalidationTask): Promise<void> {
    const relationship = CONTENT_RELATIONSHIPS[task.type]
    if (!relationship) {
      logger.warn('CacheInvalidation', '未知的内容类型', { type: task.type })
      return
    }

    try {
      // 使用 ContentRelationshipMapper 获取精准的缓存标签和路径
      const document = task.afterState || task.beforeState
      
      if (!document) {
        logger.warn('CacheInvalidation', 'No document state available for invalidation')
        return
      }

      const [cacheTags, affectedPaths] = await Promise.all([
        ContentRelationshipMapper.getAffectedCacheTags(document._type, document as SanityClientDocument),
        ContentRelationshipMapper.getAffectedPaths(document._type, document as SanityClientDocument)
      ])
      
      // 执行多层缓存失效
      await Promise.all([
        this.invalidateNextjsCache(cacheTags, affectedPaths),
        this.invalidateCloudflareCache(affectedPaths),
        this.invalidateImageCache(task)
      ])

      logger.info('CacheInvalidation', '缓存失效执行完成', {
        type: task.type,
        operation: task.operation,
        documentId: task.documentId,
        cacheTags: cacheTags.length,
        affectedPaths: affectedPaths.length
      })
    } catch (error) {
      logger.error('CacheInvalidation', '缓存失效执行失败', error as Error, {
        type: task.type,
        operation: task.operation,
        documentId: task.documentId
      })
      throw error
    }
  }

  /**
   * 确定受影响的缓存标签
   */
  private determineCacheTags(task: CacheInvalidationTask, relationship: typeof CONTENT_RELATIONSHIPS[keyof typeof CONTENT_RELATIONSHIPS]): string[] {
    const document = task.afterState || task.beforeState
    if (!document) return []

    const tags = relationship.tags(document, task.relatedData)
    
    // 添加通用标签
    tags.push(`document:${task.documentId}`)
    tags.push(`type:${task.type}`)

    return [...new Set(tags)].filter(Boolean)
  }

  /**
   * 确定受影响的路径
   */
  private determineAffectedPaths(task: CacheInvalidationTask, relationship: typeof CONTENT_RELATIONSHIPS[keyof typeof CONTENT_RELATIONSHIPS]): string[] {
    const document = task.afterState || task.beforeState
    if (!document) return []

    const paths = relationship.paths(document, task.relatedData)
    
    // 对于删除操作，也要包含删除前的路径
    if (task.operation === 'delete' && task.beforeState) {
      const beforePaths = relationship.paths(task.beforeState, task.relatedData)
      paths.push(...beforePaths)
    }

    return [...new Set(paths)].filter(Boolean)
  }

  /**
   * 失效 Next.js 缓存
   */
  private async invalidateNextjsCache(tags: string[], paths: string[]): Promise<void> {
    try {
      // 失效缓存标签
      for (const tag of tags) {
        revalidateTag(tag)
      }

      // 失效路径
      for (const path of paths) {
        revalidatePath(path)
      }

      logger.debug('CacheInvalidation', 'Next.js 缓存失效完成', {
        tags: tags.length,
        paths: paths.length
      })
    } catch (error) {
      logger.error('CacheInvalidation', 'Next.js 缓存失效失败', error as Error)
      throw error
    }
  }

  /**
   * 失效 Cloudflare 缓存
   */
  private async invalidateCloudflareCache(paths: string[]): Promise<void> {
    if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ZONE_ID) {
      logger.debug('CacheInvalidation', 'Cloudflare 配置缺失，跳过缓存清理')
      return
    }

    if (paths.length === 0) return

    try {
      // 构建完整的 URL
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com'
      const urls = paths.map(path => `${baseUrl}${path}`)

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ files: urls }),
        }
      )

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Cloudflare API error: ${response.status} ${errorData}`)
      }

      logger.debug('CacheInvalidation', 'Cloudflare 缓存失效完成', {
        urls: urls.length
      })
    } catch (error) {
      logger.error('CacheInvalidation', 'Cloudflare 缓存失效失败', error as Error)
      // 不抛出错误，避免影响其他缓存失效操作
    }
  }

  /**
   * 失效图片缓存
   */
  private async invalidateImageCache(task: CacheInvalidationTask): Promise<void> {
    try {
      const affectedImages = this.extractAffectedImages(task.beforeState, task.afterState)
      
      if (affectedImages.length === 0) return

      logger.info('CacheInvalidation', 'Invalidating image cache', {
        type: task.type,
        documentId: task.documentId,
        affectedImages
      })

      // 生成需要清理的图片 URL
      const imageUrls = affectedImages.flatMap(imageRef => {
        // 生成不同尺寸的图片 URL
        const sizes = [400, 800, 1200, 1600]
        return sizes.map(size => `${process.env.NEXT_PUBLIC_SITE_URL}/_next/image?url=${encodeURIComponent(imageRef)}&w=${size}&q=75`)
      })

      // 清理 Cloudflare 图片缓存
      if (imageUrls.length > 0) {
        await this.purgeCloudflareUrls(imageUrls)
      }

      // 注意：Sanity CDN 图片基于哈希自动失效，无需手动清理
      // 当图片内容变更时，Sanity 会生成新的哈希值，旧的 URL 自动失效
      logger.info('CacheInvalidation', 'Sanity CDN images will auto-invalidate based on content hash')

      logger.debug('CacheInvalidation', '图片缓存失效完成', {
        imageCount: affectedImages.length
      })
    } catch (error) {
      logger.error('CacheInvalidation', '图片缓存失效失败', error as Error)
      // 不抛出错误，避免影响其他缓存失效操作
    }
  }

  /**
   * 提取受影响的图片引用
   */
  private extractAffectedImages(beforeState: SanityDocument | undefined, afterState: SanityDocument | undefined): string[] {
    const images = new Set<string>()

    // 提取图片引用的辅助函数
    const extractImageRefs = (obj: unknown): string[] => {
      if (!obj) return []
      
      const refs: string[] = []
      
      // 递归遍历对象
      const traverse = (value: unknown): void => {
        if (typeof value === 'string' && value.startsWith('image-')) {
          refs.push(value)
        } else if (typeof value === 'object' && value !== null) {
          const objValue = value as Record<string, unknown>
          if (objValue._ref && typeof objValue._ref === 'string' && objValue._ref.startsWith('image-')) {
            refs.push(objValue._ref)
          }
          Object.values(objValue).forEach(traverse)
        } else if (Array.isArray(value)) {
          value.forEach(traverse)
        }
      }
      
      traverse(obj)
      return refs
    }

    // 提取前后状态的图片引用
    extractImageRefs(beforeState).forEach(ref => images.add(ref))
    extractImageRefs(afterState).forEach(ref => images.add(ref))

    return Array.from(images)
  }

  /**
   * 清理 Cloudflare 指定 URL 的缓存
   */
  private async purgeCloudflareUrls(urls: string[]): Promise<void> {
    if (urls.length === 0) return

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: urls }),
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Cloudflare API error: ${response.status} ${errorData}`)
    }
  }

  /**
   * 管理员手动清理缓存
   */
  async adminClearCache(options: {
    scope: 'all' | 'pages' | 'images' | 'type'
    contentType?: keyof typeof CONTENT_RELATIONSHIPS
    specificTarget?: string
  }): Promise<void> {
    logger.info('CacheInvalidation', '管理员手动清理缓存', options)

    try {
      switch (options.scope) {
        case 'all':
          await this.clearAllCaches()
          break
        case 'pages':
          await this.clearPageCaches()
          break
        case 'images':
          await this.clearImageCaches()
          break
        case 'type':
          if (options.contentType) {
            await this.clearCachesByType(options.contentType)
          }
          break
      }

      logger.info('CacheInvalidation', '管理员缓存清理完成', options)
    } catch (error) {
      logger.error('CacheInvalidation', '管理员缓存清理失败', error as Error, options)
      throw error
    }
  }

  private async clearAllCaches(): Promise<void> {
    // 清理所有 Next.js 缓存标签
    const allTags = [
      'collections', 'photos', 'logs', 'devCollections', 'authors',
      'homepage-collections', 'author-data'
    ]
    
    allTags.forEach(tag => revalidateTag(tag))
    
    // 清理主要路径
    const mainPaths = ['/', '/zh', '/en', '/gallery', '/log']
    mainPaths.forEach(path => revalidatePath(path))

    // 清理 Cloudflare 缓存（全部）
    if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID) {
      await this.purgeCloudflareAll()
    }
  }

  private async clearPageCaches(): Promise<void> {
    const pageTags = ['collections', 'logs', 'devCollections', 'authors']
    pageTags.forEach(tag => revalidateTag(tag))
    
    const mainPaths = ['/', '/zh', '/en', '/gallery', '/log']
    mainPaths.forEach(path => revalidatePath(path))
  }

  private async clearImageCaches(): Promise<void> {
    // 这里可以实现更精确的图片缓存清理逻辑
    revalidateTag('photos')
    
    // 清理 Cloudflare 图片缓存
    if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID) {
      // 可以根据需要实现更精确的图片缓存清理
    }
  }

  private async clearCachesByType(contentType: keyof typeof CONTENT_RELATIONSHIPS): Promise<void> {
    const relationship = CONTENT_RELATIONSHIPS[contentType]
    if (!relationship) return

    // 清理相关的缓存标签
    relationship.affects.forEach(tag => revalidateTag(tag))
  }

  private async purgeCloudflareAll(): Promise<void> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purge_everything: true }),
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Cloudflare API error: ${response.status} ${errorData}`)
    }
  }
}

// 导出单例实例
export const cacheInvalidationManager = CacheInvalidationManager.getInstance()
'use server'

import { revalidateTag, revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'
import { logger } from './logger'
import { recordCacheLog, getCacheLogs, getCacheLogStats } from './cache-logs'

interface ActionResult<T = unknown> {
  success: boolean
  message?: string
  data?: T
  clearedCount?: number
}

interface CacheStats {
  nextjsCache: {
    size: string
    entries: number
    hitRate: number
  }
  cloudflareCache: {
    status: 'active' | 'inactive'
    purgeHistory: Array<{
      timestamp: string
      type: string
      success: boolean
    }>
  }
  sanityCdn: {
    status: 'active' | 'inactive'
    autoInvalidation: boolean
  }
  recentInvalidations: Array<{
    timestamp: string
    type: string
    target: string
    success: boolean
  }>
}

// 验证管理员权限
async function verifyAdminAccess(): Promise<boolean> {
  try {
    const authResult = await auth()
    const { userId, sessionClaims, getToken } = authResult

    if (!userId) {
      return false
    }

    // 优先尝试从自定义 JWT 模板获取角色信息
    try {
      const customToken = await getToken({ template: 'default' })
      if (customToken) {
        const payload = JSON.parse(atob(customToken.split('.')[1]))
        const customMetadata = payload?.metadata as Record<string, unknown> | undefined
        if (customMetadata?.role === 'admin') {
          return true
        }
      }
    } catch {
      // JWT 模板获取失败，继续使用兜底方案
    }

    // 兜底方案1：检查 sessionClaims 中的 metadata
    const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined
    const publicMetadata = sessionClaims?.publicMetadata as Record<string, unknown> | undefined

    if (metadata?.role === 'admin' || publicMetadata?.role === 'admin') {
      return true
    }

    // 兜底方案2：通过 Clerk API 获取用户信息
    try {
      const { clerkClient } = await import('@clerk/nextjs/server')
      const client = await clerkClient()
      const user = await client.users.getUser(userId)
      if (user.publicMetadata?.role === 'admin') {
        return true
      }
    } catch {
      // API 调用失败，拒绝访问
    }

    return false
  } catch {
    return false
  }
}

// 记录缓存操作日志
function logCacheOperation(operation: string, target: string, success: boolean, details?: string, userId?: string) {
  recordCacheLog({
    operation,
    target,
    success,
    details,
    userId
  })
}

// 清理所有缓存
export async function clearAllCacheAction(): Promise<ActionResult> {
  try {
    const { userId } = await auth()
    const isAdmin = await verifyAdminAccess()
    if (!isAdmin) {
      return { success: false, message: '权限不足' }
    }

    // 清理所有缓存标签
    const allTags = [
      'collections',
      'featured-collections',
      'homepage-collections',
      'gallery-collections',
      'logs',
      'log-list',
      'log-detail',
      'dev-collections',
      'dev-collection-list',
      'photos',
      'translations',
      'author-data',
      'collection-logs',
    ]

    let clearedCount = 0
    for (const tag of allTags) {
      try {
        revalidateTag(tag)
        clearedCount++
      } catch (error) {
        logger.error(`Failed to clear tag: ${tag} - ${String(error)}`, 'cache-management')
      }
    }

    // 清理关键路径
    const keyPaths = ['/', '/zh', '/en']
    for (const path of keyPaths) {
      try {
        revalidatePath(path, 'layout')
      } catch (error) {
        logger.error(`Failed to clear path: ${path} - ${String(error)}`, 'cache-management')
      }
    }

    logCacheOperation('clear_all_cache', 'all', true, `Cleared ${clearedCount} tags`, userId || undefined)
    
    return {
      success: true,
      message: '所有缓存已清理',
      clearedCount,
    }
  } catch (error) {
    const { userId } = await auth()
    logCacheOperation('clear_all_cache', 'all', false, String(error), userId || undefined)
    logger.error(`Failed to clear all cache - ${String(error)}`, 'cache-management')
    return { success: false, message: '清理失败' }
  }
}

// 清理页面缓存
export async function clearPageCacheAction(): Promise<ActionResult> {
  try {
    const { userId } = await auth()
    const isAdmin = await verifyAdminAccess()
    if (!isAdmin) {
      return { success: false, message: '权限不足' }
    }

    // 清理页面相关的缓存标签
    const pageTags = [
      'collections',
      'featured-collections',
      'homepage-collections',
      'logs',
      'log-list',
      'dev-collections',
      'dev-collection-list',
    ]

    let clearedCount = 0
    for (const tag of pageTags) {
      try {
        revalidateTag(tag)
        clearedCount++
      } catch (error) {
        logger.error(`Failed to clear page tag: ${tag} - ${String(error)}`, 'cache-management')
      }
    }

    // 清理主要页面路径
    const pagePaths = [
      '/',
      '/zh',
      '/en',
      '/zh/collections',
      '/en/collections',
      '/zh/logs',
      '/en/logs',
      '/zh/dev',
      '/en/dev',
    ]

    for (const path of pagePaths) {
      try {
        revalidatePath(path)
      } catch (error) {
        logger.error(`Failed to clear page path: ${path} - ${String(error)}`, 'cache-management')
      }
    }

    logCacheOperation('clear_page_cache', 'pages', true, `Cleared ${clearedCount} page tags`, userId || undefined)
    
    return {
      success: true,
      message: '页面缓存已清理',
      clearedCount,
    }
  } catch (error) {
    const { userId } = await auth()
    logCacheOperation('clear_page_cache', 'pages', false, String(error), userId || undefined)
    logger.error(`Failed to clear page cache - ${String(error)}`, 'cache-management')
    return { success: false, message: '清理失败' }
  }
}

// 清理图片缓存
export async function clearImageCacheAction(): Promise<ActionResult> {
  try {
    const { userId } = await auth()
    const isAdmin = await verifyAdminAccess()
    if (!isAdmin) {
      return { success: false, message: '权限不足' }
    }

    // 清理图片相关的缓存标签
    const imageTags = ['photos', 'gallery-collections']
    
    let clearedCount = 0
    for (const tag of imageTags) {
      try {
        revalidateTag(tag)
        clearedCount++
      } catch (error) {
        logger.error(`Failed to clear image tag: ${tag} - ${String(error)}`, 'cache-management')
      }
    }

    // 注意：Sanity CDN 图片基于哈希自动失效，Cloudflare 图片缓存需要通过 API 清理
    // 这里主要清理 Next.js 层面的图片相关缓存
    
    logCacheOperation('clear_image_cache', 'images', true, `Cleared ${clearedCount} image tags`, userId || undefined)
    
    return {
      success: true,
      message: '图片缓存已清理（注：Sanity CDN 图片基于哈希自动失效）',
      clearedCount,
    }
  } catch (error) {
    const { userId } = await auth()
    logCacheOperation('clear_image_cache', 'images', false, String(error), userId || undefined)
    logger.error(`Failed to clear image cache - ${String(error)}`, 'cache-management')
    return { success: false, message: '清理失败' }
  }
}

// 按内容类型清理缓存
export async function clearCacheByTypeAction(contentType: string): Promise<ActionResult> {
  try {
    const { userId } = await auth()
    const isAdmin = await verifyAdminAccess()
    if (!isAdmin) {
      return { success: false, message: '权限不足' }
    }

    const typeTagMap: Record<string, string[]> = {
      collections: ['collections', 'featured-collections', 'homepage-collections', 'gallery-collections'],
      logs: ['logs', 'log-list', 'log-detail', 'collection-logs'],
      photos: ['photos', 'gallery-collections'],
      'dev-collections': ['dev-collections', 'dev-collection-list'],
      authors: ['author-data'],
    }

    const tags = typeTagMap[contentType]
    if (!tags) {
      return { success: false, message: '无效的内容类型' }
    }

    let clearedCount = 0
    for (const tag of tags) {
      try {
        revalidateTag(tag)
        clearedCount++
      } catch (error) {
        logger.error(`Failed to clear type tag: ${tag} - ${String(error)}`, 'cache-management')
      }
    }

    // 清理相关路径
    const typePathMap: Record<string, string[]> = {
      collections: ['/zh/collections', '/en/collections'],
      logs: ['/zh/logs', '/en/logs'],
      photos: ['/zh/collections', '/en/collections'], // 照片在合集页面中
      'dev-collections': ['/zh/dev', '/en/dev'],
      authors: ['/zh/about', '/en/about'],
    }

    const paths = typePathMap[contentType] || []
    for (const path of paths) {
      try {
        revalidatePath(path)
      } catch (error) {
        logger.error(`Failed to clear type path: ${path} - ${String(error)}`, 'cache-management')
      }
    }

    logCacheOperation('clear_cache_by_type', contentType, true, `Cleared ${clearedCount} tags`, userId || undefined)
    
    return {
      success: true,
      message: `${contentType} 类型缓存已清理`,
      clearedCount,
    }
  } catch (error) {
    const { userId } = await auth()
    logCacheOperation('clear_cache_by_type', contentType, false, String(error), userId || undefined)
    logger.error(`Failed to clear cache for type: ${contentType} - ${String(error)}`, 'cache-management')
    return { success: false, message: '清理失败' }
  }
}

// 失效特定路径
export async function invalidateSpecificPathAction(path: string): Promise<ActionResult> {
  try {
    const { userId } = await auth()
    const isAdmin = await verifyAdminAccess()
    if (!isAdmin) {
      return { success: false, message: '权限不足' }
    }

    // 验证路径格式
    if (!path.startsWith('/')) {
      return { success: false, message: '路径必须以 / 开头' }
    }

    revalidatePath(path)
    
    // 如果是布局路径，也清理布局缓存
    if (path === '/' || path === '/zh' || path === '/en') {
      revalidatePath(path, 'layout')
    }

    logCacheOperation('invalidate_specific_path', path, true, undefined, userId || undefined)
    
    return {
      success: true,
      message: `路径 ${path} 缓存已失效`,
    }
  } catch (error) {
    const { userId } = await auth()
    logCacheOperation('invalidate_specific_path', path, false, String(error), userId || undefined)
    logger.error(`Failed to invalidate path: ${path} - ${String(error)}`, 'cache-management')
    return { success: false, message: '失效失败' }
  }
}

// 获取缓存统计信息
export async function getCacheStatsAction(): Promise<ActionResult<CacheStats>> {
  try {
    const isAdmin = await verifyAdminAccess()
    if (!isAdmin) {
      return { success: false, message: '权限不足' }
    }

    // 获取缓存日志统计
    const logStats = getCacheLogStats()
    const recentLogs = getCacheLogs(10)
    
    // 计算缓存命中率（基于最近的操作成功率）
    const hitRate = logStats.total > 0 ? (logStats.successful / logStats.total) * 100 : 0
    
    const stats: CacheStats = {
      nextjsCache: {
        size: '动态计算',
        entries: logStats.total,
        hitRate: Math.round(hitRate * 10) / 10,
      },
      cloudflareCache: {
        status: 'active',
        purgeHistory: recentLogs
          .filter(log => log.operation.includes('clear'))
          .slice(0, 5)
          .map(log => ({
            timestamp: log.timestamp,
            type: log.operation,
            success: log.success,
          })),
      },
      sanityCdn: {
        status: 'active',
        autoInvalidation: true,
      },
      recentInvalidations: recentLogs
        .slice(0, 10)
        .map(log => ({
          timestamp: log.timestamp,
          type: log.operation,
          target: log.target,
          success: log.success,
        })),
    }

    return {
      success: true,
      data: stats,
    }
  } catch (error) {
    logger.error(`Failed to get cache stats - ${String(error)}`, 'cache-management')
    return { success: false, message: '获取统计信息失败' }
  }
}

// 获取缓存日志
export async function getCacheLogsAction(limit: number = 50): Promise<ActionResult> {
  try {
    const isAdmin = await verifyAdminAccess()
    if (!isAdmin) {
      return { success: false, message: '权限不足' }
    }

    const logs = getCacheLogs(limit)
    
    return {
      success: true,
      data: logs,
    }
  } catch (error) {
    logger.error(`Failed to get cache logs - ${String(error)}`, 'cache-management')
    return { success: false, message: '获取缓存日志失败' }
  }
}

// 获取缓存日志统计
export async function getCacheLogStatsAction(): Promise<ActionResult> {
  try {
    const isAdmin = await verifyAdminAccess()
    if (!isAdmin) {
      return { success: false, message: '权限不足' }
    }

    const stats = getCacheLogStats()
    
    return {
      success: true,
      data: stats,
    }
  } catch (error) {
    logger.error(`Failed to get cache log stats - ${String(error)}`, 'cache-management')
    return { success: false, message: '获取缓存日志统计失败' }
  }
}
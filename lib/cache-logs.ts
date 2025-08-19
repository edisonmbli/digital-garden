import { logger } from './logger'

interface CacheLog {
  id: string
  timestamp: string
  operation: string
  target: string
  success: boolean
  details?: string
  userId?: string
}

// 内存存储缓存日志（生产环境中应该使用数据库）
let cacheLogsStore: CacheLog[] = []
const MAX_LOGS = 100 // 最多保存100条日志

/**
 * 记录缓存操作日志
 */
export function recordCacheLog({
  operation,
  target,
  success,
  details,
  userId
}: {
  operation: string
  target: string
  success: boolean
  details?: string
  userId?: string
}): void {
  const log: CacheLog = {
    id: `cache_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    operation,
    target,
    success,
    details,
    userId
  }

  // 添加到日志存储
  cacheLogsStore.unshift(log)
  
  // 保持日志数量在限制内
  if (cacheLogsStore.length > MAX_LOGS) {
    cacheLogsStore = cacheLogsStore.slice(0, MAX_LOGS)
  }

  // 同时记录到系统日志
  const logMessage = `Cache operation: ${operation} on ${target} - ${success ? 'success' : 'failed'}${details ? ` - ${details}` : ''}${userId ? ` by user ${userId}` : ''}`
  logger.info(logMessage, 'cache-management')
}

/**
 * 获取缓存操作日志
 */
export function getCacheLogs(limit: number = 50): CacheLog[] {
  return cacheLogsStore.slice(0, limit)
}

/**
 * 清空缓存日志
 */
export function clearCacheLogs(): void {
  cacheLogsStore = []
  logger.info('Cache logs cleared', 'cache-management')
}

/**
 * 获取日志统计信息
 */
export function getCacheLogStats(): {
  total: number
  successful: number
  failed: number
  recentOperations: { operation: string; count: number }[]
} {
  const total = cacheLogsStore.length
  const successful = cacheLogsStore.filter(log => log.success).length
  const failed = total - successful
  
  // 统计最近的操作类型
  const operationCounts: Record<string, number> = {}
  cacheLogsStore.slice(0, 20).forEach(log => {
    operationCounts[log.operation] = (operationCounts[log.operation] || 0) + 1
  })
  
  const recentOperations = Object.entries(operationCounts)
    .map(([operation, count]) => ({ operation, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    total,
    successful,
    failed,
    recentOperations
  }
}
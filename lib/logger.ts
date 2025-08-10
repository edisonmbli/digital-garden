// lib/logger.ts
/**
 * 生产环境安全日志管理工具
 * 
 * 功能特性：
 * 1. 自动过滤敏感信息（密码、token、邮箱等）
 * 2. 结构化日志输出，便于生产环境监控
 * 3. 根据环境自动调整日志级别
 * 4. 支持错误追踪和性能监控
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogContext = Record<string, unknown>

interface LogEntry {
  timestamp: string
  level: LogLevel
  module: string
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
  requestId?: string
  userId?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'
  
  // 敏感信息关键词列表
  private sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'auth', 'credential',
    'email', 'phone', 'ssn', 'credit', 'card', 'api_key',
    'access_token', 'refresh_token', 'session', 'cookie'
  ]

  /**
   * 过滤敏感信息
   */
  private sanitizeData(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item))
    }

    const sanitized: Record<string, unknown> = {}
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase()
      const isSensitive = this.sensitiveKeys.some(sensitiveKey => 
        lowerKey.includes(sensitiveKey)
      )

      if (isSensitive) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  /**
   * 格式化日志条目
   */
  private formatLogEntry(
    level: LogLevel,
    module: string,
    message: string,
    context?: LogContext,
    error?: Error,
    requestId?: string,
    userId?: string
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      ...(requestId && { requestId }),
      ...(userId && { userId })
    }

    if (context) {
      entry.context = this.sanitizeData(context) as LogContext
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        ...(this.isDevelopment && { stack: error.stack })
      }
    }

    return entry
  }

  /**
   * 输出日志
   */
  private output(entry: LogEntry): void {
    if (this.isProduction) {
      // 生产环境：结构化JSON输出，便于日志聚合工具解析
      console.log(JSON.stringify(entry))
    } else {
      // 开发环境：友好的格式化输出
      const { timestamp, level, module, message, context, error } = entry
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [${module}]`
      
      console.log(`${prefix} ${message}`)
      
      if (context && Object.keys(context).length > 0) {
        console.log('Context:', context)
      }
      
      if (error) {
        console.error('Error:', error)
      }
    }
  }

  /**
   * 检查是否应该输出日志
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) {
      return true // 开发环境输出所有日志
    }

    // 生产环境只输出 info 及以上级别
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    }

    return levels[level] >= levels.info
  }

  /**
   * Debug 级别日志
   */
  debug(
    module: string,
    message: string,
    context?: LogContext,
    requestId?: string,
    userId?: string
  ): void {
    if (!this.shouldLog('debug')) return
    
    const entry = this.formatLogEntry('debug', module, message, context, undefined, requestId, userId)
    this.output(entry)
  }

  /**
   * Info 级别日志
   */
  info(
    module: string,
    message: string,
    context?: LogContext,
    requestId?: string,
    userId?: string
  ): void {
    if (!this.shouldLog('info')) return
    
    const entry = this.formatLogEntry('info', module, message, context, undefined, requestId, userId)
    this.output(entry)
  }

  /**
   * Warning 级别日志
   */
  warn(
    module: string,
    message: string,
    context?: LogContext,
    requestId?: string,
    userId?: string
  ): void {
    if (!this.shouldLog('warn')) return
    
    const entry = this.formatLogEntry('warn', module, message, context, undefined, requestId, userId)
    this.output(entry)
  }

  /**
   * Error 级别日志
   */
  error(
    module: string,
    message: string,
    error?: Error,
    context?: LogContext,
    requestId?: string,
    userId?: string
  ): void {
    if (!this.shouldLog('error')) return
    
    const entry = this.formatLogEntry('error', module, message, context, error, requestId, userId)
    this.output(entry)
  }

  /**
   * 性能监控日志
   */
  performance(
    module: string,
    operation: string,
    duration: number,
    context?: LogContext,
    requestId?: string,
    userId?: string
  ): void {
    this.info(
      module,
      `Performance: ${operation} completed in ${duration}ms`,
      { ...context, operation, duration },
      requestId,
      userId
    )
  }

  /**
   * 审计日志（重要操作记录）
   */
  audit(
    module: string,
    action: string,
    userId: string,
    context?: LogContext,
    requestId?: string
  ): void {
    this.info(
      module,
      `Audit: ${action}`,
      { ...context, action, auditLog: true },
      requestId,
      userId
    )
  }
}

// 客户端访问日志类型
interface ClientAccessLog {
  type: 'image' | 'content'
  action: 'view' | 'download' | 'copy'
  timestamp?: string
  userAgent?: string
  referer?: string
  // 通用字段
  userId?: string
  // 图片相关字段
  postId?: string
  collectionId?: string
  hasWatermark?: boolean
  // 内容相关字段
  url?: string // 仅 content 类型保留，用于区分国际化语言
  developCollectionId?: string
}

/**
 * 客户端访问日志记录器
 * 用于在浏览器环境中记录用户访问行为
 * 支持批量处理和防抖机制，避免频繁的 API 请求
 */
class ClientLogger {
  private isClient = typeof window !== 'undefined'
  private logQueue: ClientAccessLog[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private readonly BATCH_SIZE = 10 // 批量大小
  private readonly BATCH_DELAY = 2000 // 批量延迟（毫秒）
  private readonly MAX_QUEUE_SIZE = 50 // 最大队列大小
  private recentLogs = new Set<string>() // 用于防重复记录
  private readonly DUPLICATE_WINDOW = 5000 // 防重复时间窗口（毫秒）

  constructor() {
    // 在浏览器环境中设置页面卸载时的清理
    if (this.isClient) {
      window.addEventListener('beforeunload', () => {
        this.flush()
      })
      
      // 使用 visibilitychange 事件处理页面隐藏时的情况
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush()
        }
      })
    }
  }
  
  /**
   * 记录图片访问
   */
  async logImageAccess(
    action: 'view' | 'download' = 'view',
    options: {
      userId?: string
      postId?: string
      collectionId?: string
      hasWatermark?: boolean
    } = {}
  ): Promise<void> {
    if (!this.isClient) return
    
    const logData: ClientAccessLog = {
      type: 'image',
      action,
      userId: options.userId,
      postId: options.postId,
      collectionId: options.collectionId,
      hasWatermark: options.hasWatermark,
      timestamp: new Date().toISOString(),
    }
    
    this.queueLog(logData)
  }

  /**
   * 记录内容访问
   */
  async logContentAccess(
    url: string,
    action: 'view' | 'copy' = 'view',
    options: {
      userId?: string
      postId?: string
      developCollectionId?: string
    } = {}
  ): Promise<void> {
    if (!this.isClient) return
    
    const logData: ClientAccessLog = {
      type: 'content',
      action,
      url, // content 类型保留 url 用于区分国际化语言
      userId: options.userId,
      postId: options.postId,
      developCollectionId: options.developCollectionId,
      timestamp: new Date().toISOString(),
    }
    
    this.queueLog(logData)
  }

  /**
   * 将日志添加到队列中，支持防重复和批量处理
   */
  private queueLog(logData: ClientAccessLog): void {
    // 生成日志的唯一标识，用于防重复
    const logKey = this.generateLogKey(logData)
    
    // 检查是否为重复日志
    if (this.recentLogs.has(logKey)) {
      return
    }
    
    // 添加到防重复集合
    this.recentLogs.add(logKey)
    setTimeout(() => {
      this.recentLogs.delete(logKey)
    }, this.DUPLICATE_WINDOW)
    
    // 添加到队列
    this.logQueue.push(logData)
    
    // 如果队列满了，立即处理
    if (this.logQueue.length >= this.BATCH_SIZE) {
      this.processBatch()
      return
    }
    
    // 如果队列超过最大大小，移除最旧的日志
    if (this.logQueue.length > this.MAX_QUEUE_SIZE) {
      this.logQueue.shift()
    }
    
    // 设置批量处理定时器
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }
    
    this.batchTimer = setTimeout(() => {
      this.processBatch()
    }, this.BATCH_DELAY)
  }

  /**
   * 生成日志的唯一标识
   */
  private generateLogKey(logData: ClientAccessLog): string {
    const { type, action, userId, postId, collectionId, url, developCollectionId } = logData
    return `${type}-${action}-${userId || 'anonymous'}-${postId || ''}-${collectionId || ''}-${url || ''}-${developCollectionId || ''}`
  }

  /**
   * 处理批量日志
   */
  private async processBatch(): Promise<void> {
    if (this.logQueue.length === 0) return
    
    // 清除定时器
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
    
    // 取出当前队列中的所有日志
    const logsToSend = [...this.logQueue]
    this.logQueue = []
    
    try {
      await this.sendBatchAccessLogs(logsToSend)
    } catch (error) {
      console.warn('Failed to send batch access logs:', error)
      // 如果发送失败，可以考虑重新加入队列或其他处理策略
    }
  }

  /**
   * 发送批量访问日志到服务端
   */
  private async sendBatchAccessLogs(logs: ClientAccessLog[]): Promise<void> {
    if (logs.length === 0) return
    
    try {
      const response = await fetch('/api/log-access/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs }),
      })

      if (!response.ok) {
        console.warn('Failed to send batch access logs:', response.statusText)
      }
    } catch (error) {
      console.warn('Failed to send batch access logs:', error)
    }
  }

  /**
   * 发送单个访问日志到服务端（保留向后兼容性）
   */
  private async sendAccessLog(logData: ClientAccessLog): Promise<void> {
    try {
      const response = await fetch('/api/log-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...logData,
          timestamp: logData.timestamp || new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        console.warn('Failed to send access log:', response.statusText)
      }
    } catch (error) {
      console.warn('Failed to send access log:', error)
    }
  }

  /**
   * 立即处理队列中的所有日志（用于页面卸载等场景）
   */
  public flush(): void {
    if (this.logQueue.length > 0) {
      // 使用 sendBeacon API 确保在页面卸载时也能发送日志
      if (navigator.sendBeacon && this.logQueue.length > 0) {
        const logs = [...this.logQueue]
        this.logQueue = []
        
        const data = JSON.stringify({ logs })
        navigator.sendBeacon('/api/log-access/batch', data)
      } else {
        // 降级到同步处理
        this.processBatch()
      }
    }
    
    // 清理定时器
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
  }
}

// 导出单例实例
export const logger = new Logger()
export const clientLogger = new ClientLogger()

// 导出类型定义
export type { LogLevel, LogContext, LogEntry, ClientAccessLog }

// 使用示例：
/*
import { logger } from '@/lib/logger'

// 基础日志
logger.info('SensitiveWords', '开始添加敏感词', { word: 'example' })

// 错误日志
logger.error('SensitiveWords', '添加敏感词失败', error, { word: 'example' })

// 审计日志
logger.audit('SensitiveWords', '批量更新敏感词', userId, { count: 10 })

// 性能监控
const start = Date.now()
// ... 执行操作
logger.performance('SensitiveWords', 'addWord', Date.now() - start)
*/
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

// 导出单例实例
export const logger = new Logger()

// 导出类型定义
export type { LogLevel, LogContext, LogEntry }

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
/**
 * Sentry Integration Module
 * 
 * 这个模块将现有的日志系统与Sentry进行深度集成
 * 提供统一的错误处理、性能监控和业务事件追踪
 */

import * as Sentry from '@sentry/nextjs'
import { logger } from './logger'
import { analytics } from './analytics-logger'
import { ErrorSeverity, getErrorSeverity } from '../sentry.server.config'

// 扩展的错误上下文接口
interface ErrorContext {
  module: string
  userId?: string
  requestId?: string
  userAgent?: string
  url?: string
  method?: string
  statusCode?: number
  duration?: number
  additionalData?: Record<string, unknown>
}

// 业务事件类型
type BusinessEventType = 
  | 'user_action'
  | 'system_event' 
  | 'performance_issue'
  | 'security_event'
  | 'data_integrity'

// 业务事件接口
interface BusinessEvent {
  type: BusinessEventType
  action: string
  severity: 'info' | 'warning' | 'error'
  context: ErrorContext
}

/**
 * Sentry集成类
 * 提供统一的错误处理和事件追踪接口
 */
export class SentryIntegration {
  private isProduction = process.env.NODE_ENV === 'production'
  
  /**
   * 捕获并报告错误
   */
  captureError(
    error: Error,
    context: ErrorContext,
    fingerprint?: string[]
  ): string | undefined {
    const severity = getErrorSeverity(error)
    
    // 记录到本地日志系统
    logger.error(
      context.module,
      error.message,
      error,
      {
        severity,
        userId: context.userId,
        requestId: context.requestId,
        url: context.url,
        method: context.method,
        statusCode: context.statusCode,
        duration: context.duration,
        ...context.additionalData
      },
      context.requestId,
      context.userId
    )
    
    // 记录到Analytics系统
    analytics.trackError(error, {
      module: context.module,
      severity,
      userId: context.userId,
      url: context.url,
      method: context.method,
      statusCode: context.statusCode
    })
    
    // 仅在生产环境发送到Sentry
    if (this.isProduction) {
      return Sentry.withScope((scope) => {
        // 设置用户信息
        if (context.userId) {
          scope.setUser({ id: context.userId })
        }
        
        // 设置请求信息
        if (context.requestId) {
          scope.setTag('requestId', context.requestId)
        }
        
        // 设置模块信息
        scope.setTag('module', context.module)
        scope.setTag('errorSeverity', severity)
        
        // 设置错误级别
        scope.setLevel(
          severity === ErrorSeverity.CRITICAL ? 'fatal' :
          severity === ErrorSeverity.HIGH ? 'error' :
          severity === ErrorSeverity.MEDIUM ? 'warning' : 'info'
        )
        
        // 设置上下文信息
        scope.setContext('request', {
          url: context.url,
          method: context.method,
          userAgent: context.userAgent,
          statusCode: context.statusCode,
          duration: context.duration
        })
        
        // 设置额外数据
        if (context.additionalData) {
          scope.setContext('additional', context.additionalData)
        }
        
        // 设置指纹用于错误分组
        if (fingerprint) {
          scope.setFingerprint(fingerprint)
        }
        
        return Sentry.captureException(error)
      })
    }
    
    return undefined
  }
  
  /**
   * 捕获业务事件
   */
  captureBusinessEvent(event: BusinessEvent): void {
    // 记录到本地日志系统
    const logContext = {
      eventType: event.type,
      action: event.action,
      severity: event.severity,
      userId: event.context.userId,
      requestId: event.context.requestId,
      ...event.context.additionalData
    }
    
    if (event.severity === 'error') {
       logger.error(
         event.context.module,
         `Business event: ${event.type} - ${event.action}`,
         undefined,
         logContext,
         event.context.requestId,
         event.context.userId
       )
     } else if (event.severity === 'warning') {
       logger.warn(
         event.context.module,
         `Business event: ${event.type} - ${event.action}`,
         logContext,
         event.context.requestId,
         event.context.userId
       )
     } else {
       logger.info(
         event.context.module,
         `Business event: ${event.type} - ${event.action}`,
         logContext,
         event.context.requestId,
         event.context.userId
       )
     }
    
    // 记录到Analytics系统
    analytics.trackBusinessEvent(
      event.type as 'like' | 'comment' | 'share' | 'download',
      {
        userId: event.context.userId,
        action: event.action,
        requestId: event.context.requestId,
        ...event.context.additionalData
      }
    )
    
    // 仅在生产环境且为错误级别时发送到Sentry
    if (this.isProduction && event.severity === 'error') {
      Sentry.withScope((scope) => {
        if (event.context.userId) {
          scope.setUser({ id: event.context.userId })
        }
        
        scope.setTag('eventType', event.type)
        scope.setTag('action', event.action)
        scope.setTag('module', event.context.module)
        scope.setLevel('warning')
        
        scope.setContext('businessEvent', {
          type: event.type,
          action: event.action,
          severity: event.severity,
          ...event.context.additionalData
        })
        
        Sentry.captureMessage(
          `Business Event: ${event.type} - ${event.action}`,
          'warning'
        )
      })
    }
  }
  
  /**
   * 捕获性能问题
   */
  capturePerformanceIssue(
    operation: string,
    duration: number,
    threshold: number,
    context: Omit<ErrorContext, 'duration'>
  ): void {
    const contextWithDuration = { ...context, duration }
    
    // 记录到本地日志系统
    logger.warn(
      context.module,
      `Performance issue: ${operation} took ${duration}ms (threshold: ${threshold}ms)`,
      {
        operation,
        duration,
        threshold,
        performanceRatio: duration / threshold,
        userId: context.userId,
        requestId: context.requestId,
        ...context.additionalData
      },
      context.requestId,
      context.userId
    )
    
    // 记录到Analytics系统
    analytics.trackPerformance(operation, duration, {
      threshold,
      module: context.module,
      userId: context.userId,
      url: context.url,
      method: context.method
    })
    
    // 捕获为业务事件
    this.captureBusinessEvent({
      type: 'performance_issue',
      action: operation,
      severity: 'warning',
      context: contextWithDuration
    })
  }
  
  /**
   * 设置用户上下文
   */
  setUser(userId: string, email?: string, username?: string): void {
    analytics.identify(userId, { email, username })
    
    if (this.isProduction) {
      Sentry.setUser({
        id: userId,
        email,
        username
      })
    }
  }
  
  /**
   * 清除用户上下文
   */
  clearUser(): void {
    analytics.setUserId(undefined)
    
    if (this.isProduction) {
      Sentry.setUser(null)
    }
  }
  
  /**
   * 添加面包屑
   */
  addBreadcrumb(
    message: string,
    category: string,
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
    data?: Record<string, unknown>
  ): void {
    if (this.isProduction) {
      Sentry.addBreadcrumb({
        message,
        category,
        level,
        data,
        timestamp: Date.now() / 1000
      })
    }
  }
  
  /**
   * 开始性能事务
   */
  startTransaction(): {
      setTag: (key: string, value: string) => void
      setData: (key: string, value: unknown) => void
      finish: () => void
      startChild: () => {
        setTag: (key: string, value: string) => void
        setData: (key: string, value: unknown) => void
        finish: () => void
      }
    } {
      if (this.isProduction) {
        // 在生产环境中，我们使用Sentry的性能监控
        // 注意：startTransaction在新版本中可能已被弃用，这里提供兼容实现
        return {
          setTag: (key: string, value: string) => {
            Sentry.setTag(key, value)
          },
          setData: (key: string, value: unknown) => {
            Sentry.setContext(key, { value })
          },
          finish: () => {
            // 完成事务的逻辑
          },
          startChild: () => ({
            setTag: (key: string, value: string) => {
              Sentry.setTag(key, value)
            },
            setData: (key: string, value: unknown) => {
              Sentry.setContext(key, { value })
            },
            finish: () => {
              // 完成子事务的逻辑
            }
          })
        }
      }
    
    // 开发环境返回模拟对象
    return {
      setTag: () => {},
      setData: () => {},
      finish: () => {},
      startChild: () => ({
        setTag: () => {},
        setData: () => {},
        finish: () => {}
      })
    }
  }
}

// 导出单例实例
export const sentryIntegration = new SentryIntegration()

// 便捷函数导出
export const captureError = (error: Error, context: ErrorContext, fingerprint?: string[]) => 
  sentryIntegration.captureError(error, context, fingerprint)

export const captureBusinessEvent = (event: BusinessEvent) => 
  sentryIntegration.captureBusinessEvent(event)

export const capturePerformanceIssue = (
  operation: string,
  duration: number,
  threshold: number,
  context: Omit<ErrorContext, 'duration'>
) => sentryIntegration.capturePerformanceIssue(operation, duration, threshold, context)

export const setSentryUser = (userId: string, email?: string, username?: string) => 
  sentryIntegration.setUser(userId, email, username)

export const clearSentryUser = () => sentryIntegration.clearUser()

export const addSentryBreadcrumb = (
  message: string,
  category: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, unknown>
) => sentryIntegration.addBreadcrumb(message, category, level, data)

// 导出类型
export type { ErrorContext, BusinessEvent, BusinessEventType }
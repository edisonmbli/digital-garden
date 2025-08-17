// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'
import { logger } from './lib/logger'

// 错误严重性分级
enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 根据错误类型判断严重性
function getErrorSeverity(error: Error): ErrorSeverity {
  // 安全检查：确保 error.message 和 error.name 存在
  const errorMessage = (error.message || '').toLowerCase()
  const errorName = (error.name || '').toLowerCase()
  
  // 关键系统错误
  if (errorMessage.includes('database') || 
      errorMessage.includes('connection') ||
      errorMessage.includes('prisma') ||
      errorName.includes('prismaerror')) {
    return ErrorSeverity.CRITICAL
  }
  
  // 认证授权错误
  if (errorMessage.includes('auth') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorName.includes('clerkerror')) {
    return ErrorSeverity.HIGH
  }
  
  // 业务逻辑错误
  if (errorMessage.includes('validation') ||
      errorMessage.includes('comment') ||
      errorMessage.includes('like') ||
      errorMessage.includes('upload')) {
    return ErrorSeverity.MEDIUM
  }
  
  // 默认为低级别
  return ErrorSeverity.LOW
}

// 仅在生产环境启用 Sentry
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    
    // 性能监控采样率 - 降低到20%以减少开销
    tracesSampleRate: 0.2,
    
    // 错误采样率 - 保持100%捕获所有错误
    sampleRate: 1.0,
    
    // 启用日志但设置合理的级别
    enableLogs: true,
    
    // 生产环境关闭调试
    debug: false,
    
    // 环境标识
    environment: 'production',
    
    // 发布版本
    release: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    
    // 错误过滤 - 过滤掉不重要的错误
    beforeSend(event, hint) {
      const originalException = hint.originalException
      
      // 确保 originalException 是一个有效的 Error 对象
      if (originalException && typeof originalException === 'object' && 
          (originalException instanceof Error || 
           ('name' in originalException) || 
           ('message' in originalException))) {
        const error = originalException as Error
        const severity = getErrorSeverity(error)
        
        // 设置错误级别
        event.level = severity === ErrorSeverity.CRITICAL ? 'fatal' :
                     severity === ErrorSeverity.HIGH ? 'error' :
                     severity === ErrorSeverity.MEDIUM ? 'warning' : 'info'
        
        // 添加自定义标签
         event.tags = {
           ...event.tags,
           errorSeverity: severity,
           module: (event.extra?.module as string) || 'unknown'
         }
        
        // 集成现有日志系统
        logger.error(
          'Sentry',
          `Error captured: ${error.message}`,
          error,
          {
            severity,
            sentryEventId: event.event_id,
            fingerprint: event.fingerprint
          }
        )
      }
      
      // 过滤掉一些常见的非关键错误
      if (event.exception?.values?.[0]?.value?.includes('Network Error') ||
          event.exception?.values?.[0]?.value?.includes('Failed to fetch') ||
          event.exception?.values?.[0]?.value?.includes('Load failed')) {
        return null // 不发送到Sentry
      }
      
      return event
    },
    
    // 性能事务过滤
    beforeSendTransaction(event) {
      // 过滤掉过短的事务（可能是噪音）
      if (event.start_timestamp && event.timestamp) {
        const duration = event.timestamp - event.start_timestamp
        if (duration < 0.1) { // 小于100ms的事务
          return null
        }
      }
      
      return event
    },
    
    // 集成配置 - 使用默认集成
      integrations: (defaultIntegrations) => {
        return defaultIntegrations.filter(() => {
          // 保留默认集成，可以在这里过滤不需要的集成
          return true
        })
      },
    
    // 忽略特定错误 - 仅忽略确定的噪音错误
    ignoreErrors: [
      // 客户端网络错误（服务端不应该处理）
      'Network Error',
      'Failed to fetch',
      
      // 浏览器扩展相关（服务端不相关）
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',
      
      // 第三方脚本错误（服务端不相关）
      'Script error',
      
      // 开发环境热重载错误
      'ChunkLoadError',
    ],
    
    // 忽略特定URL
    denyUrls: [
      // 浏览器扩展
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
      
      // 第三方脚本
      /googletagmanager/i,
      /google-analytics/i,
      /googleadservices/i,
    ]
  })
  
  logger.info('Sentry', 'Sentry server initialized in production mode')
} else {
  // 开发环境完全禁用 Sentry
  console.log('[DEBUG] Sentry disabled in development environment')
}

// 导出错误严重性枚举供其他模块使用
export { ErrorSeverity, getErrorSeverity }

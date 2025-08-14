/**
 * Sentry 监控策略 - Digital Garden AI 项目
 * 
 * 明确定位：Sentry 专注于错误监控和性能监控，与现有 Analytics 系统形成互补
 * 
 * 分工策略：
 * - Sentry: 错误追踪、性能监控、异常告警、技术指标
 * - Analytics: 用户行为、业务指标、产品分析、增长数据
 */

import { captureError, captureBusinessEvent, addSentryBreadcrumb } from './sentry-integration'
import { logger } from './logger'

// =============================================================================
// 1. 认证与授权层监控
// =============================================================================

/**
 * 中间件认证错误监控
 */
export const monitorAuthError = (error: Error, context: {
  pathname: string
  userAgent?: string
  ip?: string
}) => {
  addSentryBreadcrumb(
    'Authentication attempt',
    'auth',
    'info',
    {
      pathname: context.pathname,
      userAgent: context.userAgent
    }
  )
  
  captureError(error, {
    module: 'middleware',
    userId: undefined,
    url: context.pathname,
    additionalData: {
      ip: context.ip,
      userAgent: context.userAgent
    }
  })
}

/**
 * Clerk Webhook 处理错误监控
 */
export const monitorClerkWebhookError = (error: Error, context: {
  eventType: string
  userId?: string
  webhookId?: string
}) => {
  addSentryBreadcrumb(
    'Clerk webhook processing',
    'webhook',
    'info',
    {
      eventType: context.eventType,
      userId: context.userId
    }
  )
  
  captureError(error, {
    module: 'clerk-webhook',
    userId: context.userId,
    additionalData: {
      eventType: context.eventType,
      webhookId: context.webhookId
    }
  })
}

/**
 * OAuth 登录错误监控
 */
export const monitorOAuthError = (error: Error, context: {
  provider: 'google' | 'github' | 'other'
  errorCode?: string
  errorDescription?: string
  userId?: string
  userAgent?: string
  ip?: string
}) => {
  addSentryBreadcrumb(
    'OAuth login attempt',
    'auth',
    'error',
    {
      provider: context.provider,
      errorCode: context.errorCode
    }
  )
  
  captureError(error, {
    module: 'oauth-login',
    userId: context.userId,
    additionalData: {
      provider: context.provider,
      errorCode: context.errorCode,
      errorDescription: context.errorDescription,
      userAgent: context.userAgent,
      ip: context.ip
    }
  })
}

/**
 * Clerk 认证流程错误监控
 */
export const monitorClerkAuthError = (error: Error, context: {
  authFlow: 'sign-in' | 'sign-up' | 'oauth' | 'middleware'
  errorType?: string
  userId?: string
  pathname?: string
}) => {
  addSentryBreadcrumb(
    'Clerk authentication error',
    'auth',
    'error',
    {
      authFlow: context.authFlow,
      errorType: context.errorType,
      pathname: context.pathname
    }
  )
  
  captureError(error, {
    module: 'clerk-auth',
    userId: context.userId,
    url: context.pathname,
    additionalData: {
      authFlow: context.authFlow,
      errorType: context.errorType
    }
  })
}

/**
 * 权限验证失败监控
 */
export const monitorPermissionDenied = (context: {
  userId?: string
  requiredRole: string
  currentRole?: string
  resource: string
}) => {
  addSentryBreadcrumb(
    'Permission check failed',
    'authorization',
    'warning',
    {
      requiredRole: context.requiredRole,
      currentRole: context.currentRole,
      resource: context.resource
    }
  )
  
  captureBusinessEvent({
    type: 'security_event',
    action: 'permission_denied',
    severity: 'warning',
    context: {
      module: 'authorization',
      userId: context.userId,
      additionalData: {
        requiredRole: context.requiredRole,
        currentRole: context.currentRole,
        resource: context.resource
      }
    }
  })
}

// =============================================================================
// 2. 数据库操作层监控
// =============================================================================

/**
 * 数据库错误监控
 */
export const monitorDatabaseError = (error: Error, context: {
  operation: string
  model?: string
  query?: string
  userId?: string
}) => {
  addSentryBreadcrumb(
    'Database operation',
    'database',
    'info',
    {
      operation: context.operation,
      model: context.model
    }
  )
  
  const dbError = error as Error & { code?: string; meta?: unknown }
  
  captureError(error, {
    module: 'database',
    userId: context.userId,
    additionalData: {
      operation: context.operation,
      model: context.model,
      query: context.query?.substring(0, 200),
      errorCode: dbError.code,
      errorMeta: dbError.meta
    }
  })
}

/**
 * 事务失败监控
 */
export const monitorTransactionError = (error: Error, context: {
  transactionName: string
  operations: string[]
  userId?: string
}) => {
  addSentryBreadcrumb(
    'Database transaction started',
    'database',
    'info',
    {
      transactionName: context.transactionName,
      operationCount: context.operations.length
    }
  )
  
  captureError(error, {
    module: 'database',
    userId: context.userId,
    additionalData: {
      operation: 'transaction',
      transactionName: context.transactionName,
      operations: context.operations,
      rollbackReason: error.message
    }
  })
}

/**
 * 慢查询监控
 */
export const monitorSlowQuery = (context: {
  operation: string
  model: string
  duration: number
  threshold: number
}) => {
  if (context.duration > context.threshold) {
    captureBusinessEvent({
      type: 'performance_issue',
      action: 'slow_database_query',
      severity: 'warning',
      context: {
        module: 'database',
        duration: context.duration,
        additionalData: {
          operation: context.operation,
          model: context.model,
          threshold: context.threshold
        }
      }
    })
  }
}

// =============================================================================
// 3. 外部服务集成监控
// =============================================================================

/**
 * Sanity CMS 错误监控
 */
export const monitorSanityError = (error: Error, context: {
  operation: 'fetch' | 'webhook' | 'sync'
  documentType?: string
  documentId?: string
  query?: string
}) => {
  addSentryBreadcrumb(
    'Sanity CMS operation',
    'external-service',
    'info',
    {
      operation: context.operation,
      documentType: context.documentType
    }
  )
  
  captureError(error, {
    module: 'sanity-cms',
    additionalData: {
      operation: context.operation,
      documentType: context.documentType,
      documentId: context.documentId,
      query: context.query?.substring(0, 200),
      endpoint: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    }
  })
}

/**
 * 外部 API 错误监控
 */
export const monitorExternalApiError = (error: Error, context: {
  service: string
  endpoint: string
  method: string
  statusCode?: number
  responseTime?: number
}) => {
  addSentryBreadcrumb(
    'External API call',
    'external-service',
    'info',
    {
      service: context.service,
      method: context.method,
      endpoint: context.endpoint
    }
  )
  
  captureError(error, {
    module: 'external-api',
    additionalData: {
      service: context.service,
      endpoint: context.endpoint,
      method: context.method,
      statusCode: context.statusCode,
      responseTime: context.responseTime
    }
  })
}

// =============================================================================
// 4. 性能监控
// =============================================================================

/**
 * 页面加载性能监控
 */
export const monitorPagePerformance = (context: {
  page: string
  loadTime: number
  userId?: string
  locale?: string
}) => {
  const threshold = 3000 // 3秒
  if (context.loadTime > threshold) {
    captureBusinessEvent({
      type: 'performance_issue',
      action: 'slow_page_load',
      severity: 'warning',
      context: {
        module: 'performance',
        userId: context.userId,
        duration: context.loadTime,
        additionalData: {
          page: context.page,
          locale: context.locale,
          threshold
        }
      }
    })
  }
}

/**
 * API 响应时间监控
 */
export const monitorApiPerformance = (context: {
  endpoint: string
  method: string
  duration: number
  statusCode: number
  userId?: string
}) => {
  const threshold = 1000 // 1秒
  if (context.duration > threshold) {
    captureBusinessEvent({
      type: 'performance_issue',
      action: 'slow_api_response',
      severity: 'warning',
      context: {
        module: 'api',
        userId: context.userId,
        duration: context.duration,
        statusCode: context.statusCode,
        additionalData: {
          endpoint: context.endpoint,
          method: context.method,
          threshold
        }
      }
    })
  }
}

/**
 * 图片加载监控
 */
export const monitorImagePerformance = (context: {
  imageUrl: string
  loadTime?: number
  error?: Error
  source: 'sanity' | 'local' | 'external'
}) => {
  if (context.error) {
    captureError(context.error, {
      module: 'image-loading',
      additionalData: {
        imageUrl: context.imageUrl,
        source: context.source
      }
    })
  } else if (context.loadTime && context.loadTime > 2000) {
    captureBusinessEvent({
      type: 'performance_issue',
      action: 'slow_image_load',
      severity: 'info',
      context: {
        module: 'image-loading',
        duration: context.loadTime,
        additionalData: {
          imageUrl: context.imageUrl,
          source: context.source
        }
      }
    })
  }
}

// =============================================================================
// 5. 业务逻辑错误监控
// =============================================================================

/**
 * 评论审核错误监控
 */
export const monitorCommentModerationError = (error: Error, context: {
  commentId: string
  userId: string
  moderationType: 'spam-detection' | 'sensitive-words' | 'rate-limit'
}) => {
  addSentryBreadcrumb(
    'Comment moderation check',
    'moderation',
    'info',
    {
      moderationType: context.moderationType,
      commentId: context.commentId
    }
  )
  
  captureError(error, {
    module: 'comment-moderation',
    userId: context.userId,
    additionalData: {
      commentId: context.commentId,
      moderationType: context.moderationType
    }
  })
}

/**
 * 多语言错误监控
 */
export const monitorLocalizationError = (error: Error, context: {
  requestedLocale: string
  fallbackLocale: string
  pathname: string
}) => {
  addSentryBreadcrumb(
    'Localization processing',
    'i18n',
    'info',
    {
      requestedLocale: context.requestedLocale,
      pathname: context.pathname
    }
  )
  
  captureError(error, {
    module: 'localization',
    additionalData: {
      requestedLocale: context.requestedLocale,
      fallbackLocale: context.fallbackLocale,
      pathname: context.pathname
    }
  })
}

// =============================================================================
// 6. 工具函数
// =============================================================================

/**
 * 包装异步函数，自动添加错误监控
 */
export function withSentryMonitoring<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context: {
    module: string
    operation: string
    userId?: string
  }
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()
    
    try {
      addSentryBreadcrumb(
        `${context.module}: ${context.operation} started`,
        context.module,
        'info'
      )
      
      const result = await fn(...args)
      
      const duration = Date.now() - startTime
      if (duration > 1000) {
        captureBusinessEvent({
          type: 'performance_issue',
          action: 'slow_operation',
          severity: 'info',
          context: {
            module: context.module,
            userId: context.userId,
            duration,
            additionalData: {
              operation: context.operation
            }
          }
        })
      }
      
      return result
    } catch (error) {
      captureError(error as Error, {
        module: context.module,
        userId: context.userId,
        additionalData: {
          operation: context.operation,
          duration: Date.now() - startTime,
          args: JSON.stringify(args).substring(0, 200)
        }
      })
      throw error
    }
  }
}

/**
 * 检查是否应该启用 Sentry 监控
 */
export const isSentryEnabled = (): boolean => {
  return process.env.NODE_ENV === 'production' && !!process.env.NEXT_PUBLIC_SENTRY_DSN
}

/**
 * 开发环境监控
 */
export const devMonitor = (message: string, data?: Record<string, unknown>) => {
  if (process.env.NODE_ENV === 'development') {
    logger.info('Sentry-Dev', message, data)
  }
}

// =============================================================================
// 7. 监控配置
// =============================================================================

export const SENTRY_MONITORING_CONFIG = {
  errorMonitoring: {
    enabled: true,
    sampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 1.0,
    beforeSend: (event: unknown) => {
      const sentryEvent = event as { request?: { headers?: Record<string, unknown> } }
      if (sentryEvent.request?.headers) {
        delete sentryEvent.request.headers.authorization
        delete sentryEvent.request.headers.cookie
      }
      return event
    }
  },
  
  performanceMonitoring: {
    enabled: process.env.NODE_ENV === 'production',
    sampleRate: 0.1,
    thresholds: {
      pageLoad: 3000,
      apiResponse: 1000,
      databaseQuery: 500,
      imageLoad: 2000
    }
  },
  
  breadcrumbs: {
    enabled: true,
    maxBreadcrumbs: 50,
    categories: ['auth', 'database', 'external-service', 'moderation', 'i18n']
  }
} as const
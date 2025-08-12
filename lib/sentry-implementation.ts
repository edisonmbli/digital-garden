/**
 * Sentry 监控实现 - 在项目关键位置集成监控
 * 
 * 这个文件展示如何在项目的实际代码中应用 Sentry 监控策略
 * 重点关注错误监控和性能监控，避免与现有 Analytics 系统重复
 */

import {
  monitorAuthError,
  monitorClerkWebhookError,
  monitorPermissionDenied,
  monitorDatabaseError,
  monitorTransactionError,
  monitorSlowQuery,
  monitorSanityError,
  monitorExternalApiError,
  monitorPagePerformance,
  monitorApiPerformance,
  monitorImagePerformance,
  monitorCommentModerationError,
  monitorLocalizationError,
  withSentryMonitoring,
  isSentryEnabled
} from './sentry-monitoring-strategy'

// =============================================================================
// 1. 中间件集成 (middleware.ts)
// =============================================================================

/**
 * 在 middleware.ts 中集成认证监控
 * 使用示例：
 */
export const enhanceMiddlewareWithSentry = () => {
  return {
    // 认证错误处理
    handleAuthError: (error: Error, request: Request) => {
      if (isSentryEnabled()) {
        monitorAuthError(error, {
          pathname: new URL(request.url).pathname,
          userAgent: request.headers.get('user-agent') || undefined,
          ip: request.headers.get('x-forwarded-for') || undefined
        })
      }
    },

    // 权限检查失败
    handlePermissionDenied: (context: {
      userId?: string
      requiredRole: string
      currentRole?: string
      resource: string
    }) => {
      if (isSentryEnabled()) {
        monitorPermissionDenied(context)
      }
    }
  }
}

// =============================================================================
// 2. DAL 层集成 (lib/dal.ts)
// =============================================================================

/**
 * 增强 DAL 函数，添加数据库监控
 */
export const enhanceDALWithSentry = () => {
  return {
    // 包装数据库操作
    wrapDatabaseOperation: <T extends unknown[], R>(
      operation: (...args: T) => Promise<R>,
      operationName: string
    ) => {
      return withSentryMonitoring(operation, {
        module: 'database',
        operation: operationName
      })
    },

    // 数据库错误处理
    handleDatabaseError: (error: Error, context: {
      operation: string
      model?: string
      query?: string
      userId?: string
    }) => {
      if (isSentryEnabled()) {
        monitorDatabaseError(error, context)
      }
    },

    // 事务错误处理
    handleTransactionError: (error: Error, context: {
      transactionName: string
      operations: string[]
      userId?: string
    }) => {
      if (isSentryEnabled()) {
        monitorTransactionError(error, context)
      }
    },

    // 慢查询监控
    checkQueryPerformance: (context: {
      operation: string
      model: string
      duration: number
      threshold?: number
    }) => {
      if (isSentryEnabled()) {
        monitorSlowQuery({
          ...context,
          threshold: context.threshold || 500 // 默认 500ms
        })
      }
    }
  }
}

// =============================================================================
// 3. API Routes 集成
// =============================================================================

/**
 * API Routes 性能和错误监控
 */
export const enhanceAPIWithSentry = () => {
  return {
    // API 性能监控中间件
    performanceMiddleware: (handler: (req: Request, res: Response) => Promise<unknown>) => {
      return async (req: Request, res: Response) => {
        const startTime = Date.now()
        const endpoint = new URL(req.url || '').pathname
        const method = req.method || 'GET'
        
        try {
          const result = await handler(req, res)
          
          // 监控 API 性能
          if (isSentryEnabled()) {
            const duration = Date.now() - startTime
            monitorApiPerformance({
              endpoint,
              method,
              duration,
              statusCode: res.status || 200,
              userId: (req as Request & { auth?: { userId?: string } }).auth?.userId
            })
          }
          
          return result
        } catch (error) {
          // API 错误监控已在现有的错误处理中覆盖
          throw error
        }
      }
    },

    // Clerk Webhook 错误处理
    handleClerkWebhookError: (error: Error, context: {
      eventType: string
      userId?: string
      webhookId?: string
    }) => {
      if (isSentryEnabled()) {
        monitorClerkWebhookError(error, context)
      }
    }
  }
}

// =============================================================================
// 4. Sanity CMS 集成
// =============================================================================

/**
 * Sanity CMS 操作监控
 */
export const enhanceSanityWithSentry = () => {
  return {
    // 包装 Sanity 查询
    wrapSanityQuery: <T>(
      queryFn: () => Promise<T>,
      context: {
        operation: 'fetch' | 'webhook' | 'sync'
        documentType?: string
        query?: string
      }
    ) => {
      return withSentryMonitoring(queryFn, {
        module: 'sanity-cms',
        operation: context.operation
      })
    },

    // Sanity 错误处理
    handleSanityError: (error: Error, context: {
      operation: 'fetch' | 'webhook' | 'sync'
      documentType?: string
      documentId?: string
      query?: string
    }) => {
      if (isSentryEnabled()) {
        monitorSanityError(error, context)
      }
    }
  }
}

// =============================================================================
// 5. 客户端组件集成
// =============================================================================

/**
 * 客户端性能监控工具
 */
export const enhanceClientWithSentry = () => {
  return {
    // 页面性能监控
    trackPagePerformance: (context: {
      page: string
      loadTime: number
      userId?: string
      locale?: string
    }) => {
      if (isSentryEnabled() && typeof window !== 'undefined') {
        monitorPagePerformance(context)
      }
    },

    // 图片加载监控
    trackImagePerformance: (context: {
      imageUrl: string
      loadTime?: number
      error?: Error
      source: 'sanity' | 'local' | 'external'
    }) => {
      if (isSentryEnabled() && typeof window !== 'undefined') {
        monitorImagePerformance(context)
      }
    },

    // 外部 API 调用监控
    trackExternalApiCall: (error: Error, context: {
      service: string
      endpoint: string
      method: string
      statusCode?: number
      responseTime?: number
    }) => {
      if (isSentryEnabled()) {
        monitorExternalApiError(error, context)
      }
    }
  }
}

// =============================================================================
// 6. 业务逻辑集成
// =============================================================================

/**
 * 业务逻辑错误监控
 */
export const enhanceBusinessLogicWithSentry = () => {
  return {
    // 评论审核错误
    handleModerationError: (error: Error, context: {
      commentId: string
      userId: string
      moderationType: 'spam-detection' | 'sensitive-words' | 'rate-limit'
    }) => {
      if (isSentryEnabled()) {
        monitorCommentModerationError(error, context)
      }
    },

    // 多语言错误
    handleLocalizationError: (error: Error, context: {
      requestedLocale: string
      fallbackLocale: string
      pathname: string
    }) => {
      if (isSentryEnabled()) {
        monitorLocalizationError(error, context)
      }
    }
  }
}

// =============================================================================
// 7. 使用示例和最佳实践
// =============================================================================

/**
 * 在 DAL 中的使用示例
 */
export const exampleDALUsage = () => {
  const { wrapDatabaseOperation, handleDatabaseError, checkQueryPerformance } = enhanceDALWithSentry()

  // 包装数据库操作
  const getPostById = wrapDatabaseOperation(
    async (id: string) => {
      const startTime = Date.now()
      try {
        // 原始的数据库查询逻辑
        const result = await prisma.post.findUnique({ where: { id } })
        
        // 检查查询性能
        checkQueryPerformance({
          operation: 'findUnique',
          model: 'Post',
          duration: Date.now() - startTime
        })
        
        return result
      } catch (error) {
        // 处理数据库错误
        handleDatabaseError(error as Error, {
          operation: 'findUnique',
          model: 'Post',
          query: `findUnique({ where: { id: "${id}" } })`
        })
        throw error
      }
    },
    'getPostById'
  )

  return { getPostById }
}

/**
 * 在 middleware.ts 中的使用示例
 */
export const exampleMiddlewareUsage = () => {
  const { handleAuthError, handlePermissionDenied } = enhanceMiddlewareWithSentry()

  return {
    authMiddleware: async (request: Request) => {
      try {
        // 原始的认证逻辑
        const auth = await authenticateRequest(request)
        
        // 权限检查
        if (!hasPermission(auth.user, 'read')) {
          handlePermissionDenied({
            userId: auth.user.id,
            requiredRole: 'user',
            currentRole: auth.user.role,
            resource: new URL(request.url).pathname
          })
          throw new Error('Permission denied')
        }
        
        return auth
      } catch (error) {
        handleAuthError(error as Error, request)
        throw error
      }
    }
  }
}

// 占位函数，实际项目中应该从相应模块导入
declare const prisma: {
  post: {
    findUnique: (args: { where: { id: string } }) => Promise<unknown>
  }
}
declare function authenticateRequest(request: Request): Promise<{ user: { id: string; role: string } }>
declare function hasPermission(user: { id: string; role: string }, permission: string): boolean

/**
 * 导出所有增强函数
 */
export const sentryEnhancements = {
  middleware: enhanceMiddlewareWithSentry(),
  dal: enhanceDALWithSentry(),
  api: enhanceAPIWithSentry(),
  sanity: enhanceSanityWithSentry(),
  client: enhanceClientWithSentry(),
  business: enhanceBusinessLogicWithSentry()
}
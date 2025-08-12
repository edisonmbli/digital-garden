/**
 * Sentry DAL 层集成
 * 为数据库操作添加错误和性能监控
 */

import * as Sentry from '@sentry/nextjs'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

/**
 * 数据库操作包装器
 * 添加性能监控和错误处理
 */
export function withDatabaseMonitoring<T extends unknown[], R>(
  operation: (...args: T) => Promise<R>,
  operationName: string,
  model?: string
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()
    
    // 添加操作面包屑
    Sentry.addBreadcrumb({
      message: `Database operation: ${operationName}`,
      category: 'database',
      level: 'info',
      data: {
        operation: operationName,
        model: model || 'unknown'
      }
    })

    try {
      const result = await operation(...args)
      
      // 检查查询性能
      const duration = Date.now() - startTime
      if (duration > 1000) { // 超过1秒的查询
        Sentry.addBreadcrumb({
          message: 'Slow database query detected',
          category: 'performance',
          level: 'warning',
          data: {
            operation: operationName,
            model: model || 'unknown',
            duration
          }
        })
      }
      
      return result
    } catch (error) {
      // 处理数据库错误
      handleDatabaseError(error as Error, {
        operation: operationName,
        model: model || 'unknown'
      })
      throw error
    }
  }
}

/**
 * 数据库错误处理
 */
function handleDatabaseError(
  error: Error,
  context: {
    operation: string
    model: string
    query?: string
  }
) {
  Sentry.withScope((scope) => {
    scope.setTag('component', 'database')
    scope.setTag('operation', context.operation)
    scope.setTag('model', context.model)
    
    if (context.query) {
      scope.setExtra('query', context.query)
    }
    
    // 根据错误类型设置不同的级别
    if (error instanceof PrismaClientKnownRequestError) {
      scope.setTag('error_type', 'prisma_known')
      scope.setTag('error_code', error.code)
      scope.setLevel('error')
      
      // 特殊处理常见错误
      switch (error.code) {
        case 'P2002': // Unique constraint violation
          scope.setTag('constraint_violation', 'unique')
          break
        case 'P2025': // Record not found
          scope.setTag('not_found', 'true')
          scope.setLevel('warning')
          break
        case 'P1001': // Connection error
          scope.setTag('connection_error', 'true')
          scope.setLevel('fatal')
          break
      }
    } else {
      scope.setTag('error_type', 'unknown')
      scope.setLevel('error')
    }
    
    Sentry.captureException(error)
  })
}

/**
 * 事务监控包装器
 */
export function withTransactionMonitoring<T>(
  transactionFn: () => Promise<T>,
  transactionName: string
) {
  return async (): Promise<T> => {
    const startTime = Date.now()
    
    Sentry.addBreadcrumb({
      message: `Database transaction started: ${transactionName}`,
      category: 'database',
      level: 'info',
      data: {
        transaction: transactionName
      }
    })

    try {
      const result = await transactionFn()
      
      const duration = Date.now() - startTime
      Sentry.addBreadcrumb({
        message: `Database transaction completed: ${transactionName}`,
        category: 'database',
        level: 'info',
        data: {
          transaction: transactionName,
          duration,
          status: 'success'
        }
      })
      
      return result
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTag('component', 'database')
        scope.setTag('operation', 'transaction')
        scope.setTag('transaction_name', transactionName)
        scope.setExtra('duration', Date.now() - startTime)
        Sentry.captureException(error)
      })
      
      throw error
    }
  }
}

/**
 * 连接池监控
 */
export function monitorConnectionPool() {
  // 这里可以添加连接池状态监控
  // 实际实现需要根据 Prisma 的具体 API
  Sentry.addBreadcrumb({
    message: 'Database connection pool status check',
    category: 'database',
    level: 'debug'
  })
}

/**
 * 数据库健康检查
 */
export async function databaseHealthCheck(prisma: {
  $queryRaw: (query: TemplateStringsArray) => Promise<unknown>
}) {
  try {
    await prisma.$queryRaw`SELECT 1`
    
    Sentry.addBreadcrumb({
      message: 'Database health check passed',
      category: 'database',
      level: 'info'
    })
    
    return true
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag('component', 'database')
      scope.setTag('operation', 'health_check')
      scope.setLevel('fatal')
      Sentry.captureException(error)
    })
    
    return false
  }
}
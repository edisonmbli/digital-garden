/**
 * Sentry API 路由集成
 * 为 API 路由添加错误和性能监控
 */

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

/**
 * API 路由包装器
 * 添加请求监控和错误处理
 */
export function withApiMonitoring<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  routeName: string
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now()
    
    // 设置请求上下文
    Sentry.withScope((scope) => {
      scope.setTag('component', 'api')
      scope.setTag('route', routeName)
      scope.setTag('method', request.method)
      scope.setExtra('url', request.url)
      scope.setExtra('userAgent', request.headers.get('user-agent'))
      
      // 添加请求面包屑
      Sentry.addBreadcrumb({
        message: `API request: ${request.method} ${routeName}`,
        category: 'api',
        level: 'info',
        data: {
          method: request.method,
          route: routeName,
          url: request.url
        }
      })
    })

    try {
      const response = await handler(request, ...args)
      
      // 记录响应信息
      const duration = Date.now() - startTime
      const statusCode = response.status
      
      Sentry.addBreadcrumb({
        message: `API response: ${statusCode}`,
        category: 'api',
        level: statusCode >= 400 ? 'error' : 'info',
        data: {
          statusCode,
          duration,
          route: routeName
        }
      })
      
      // 监控慢请求
      if (duration > 2000) {
        Sentry.addBreadcrumb({
          message: 'Slow API response detected',
          category: 'performance',
          level: 'warning',
          data: {
            duration,
            route: routeName,
            statusCode
          }
        })
      }
      
      // 监控错误状态码
      if (statusCode >= 400) {
        Sentry.withScope(async (scope) => {
          scope.setTag('status_code', statusCode.toString())
          scope.setLevel(statusCode >= 500 ? 'error' : 'warning')
          
          if (statusCode >= 500) {
            try {
              const responseBody = await response.clone().text()
              scope.setExtra('response_body', responseBody)
            } catch {
              scope.setExtra('response_body', 'Unable to read response body')
            }
          }
          
          Sentry.captureMessage(`API error response: ${statusCode}`, 'error')
        })
      }
      
      return response
    } catch (error) {
      // 捕获 API 错误
      Sentry.withScope((scope) => {
        scope.setTag('component', 'api')
        scope.setTag('route', routeName)
        scope.setTag('method', request.method)
        scope.setExtra('duration', Date.now() - startTime)
        scope.setExtra('url', request.url)
        
        Sentry.captureException(error)
      })
      
      // 返回错误响应
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Webhook 监控包装器
 */
export function withWebhookMonitoring(
  handler: (request: NextRequest) => Promise<NextResponse>,
  webhookName: string
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()
    
    Sentry.withScope((scope) => {
      scope.setTag('component', 'webhook')
      scope.setTag('webhook_name', webhookName)
      scope.setExtra('headers', Object.fromEntries(request.headers.entries()))
      
      Sentry.addBreadcrumb({
        message: `Webhook received: ${webhookName}`,
        category: 'webhook',
        level: 'info',
        data: {
          webhook: webhookName,
          contentType: request.headers.get('content-type')
        }
      })
    })

    try {
      const response = await handler(request)
      
      const duration = Date.now() - startTime
      Sentry.addBreadcrumb({
        message: `Webhook processed: ${webhookName}`,
        category: 'webhook',
        level: 'info',
        data: {
          webhook: webhookName,
          duration,
          statusCode: response.status
        }
      })
      
      return response
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTag('component', 'webhook')
        scope.setTag('webhook_name', webhookName)
        scope.setExtra('duration', Date.now() - startTime)
        
        Sentry.captureException(error)
      })
      
      return NextResponse.json(
        { error: 'Webhook processing failed' },
        { status: 500 }
      )
    }
  }
}

/**
 * Server Action 监控包装器
 */
export function withServerActionMonitoring<T extends unknown[], R>(
  action: (...args: T) => Promise<R>,
  actionName: string
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()
    
    Sentry.withScope((scope) => {
      scope.setTag('component', 'server_action')
      scope.setTag('action_name', actionName)
      
      Sentry.addBreadcrumb({
        message: `Server Action: ${actionName}`,
        category: 'server_action',
        level: 'info',
        data: {
          action: actionName
        }
      })
    })

    try {
      const result = await action(...args)
      
      const duration = Date.now() - startTime
      Sentry.addBreadcrumb({
        message: `Server Action completed: ${actionName}`,
        category: 'server_action',
        level: 'info',
        data: {
          action: actionName,
          duration
        }
      })
      
      return result
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTag('component', 'server_action')
        scope.setTag('action_name', actionName)
        scope.setExtra('duration', Date.now() - startTime)
        
        Sentry.captureException(error)
      })
      
      throw error
    }
  }
}

/**
 * 外部 API 调用监控
 */
export async function monitorExternalApiCall<T>(
  apiCall: () => Promise<T>,
  apiName: string,
  endpoint?: string
): Promise<T> {
  const startTime = Date.now()
  
  Sentry.addBreadcrumb({
    message: `External API call: ${apiName}`,
    category: 'external_api',
    level: 'info',
    data: {
      api: apiName,
      endpoint: endpoint || 'unknown'
    }
  })

  try {
    const result = await apiCall()
    
    const duration = Date.now() - startTime
    Sentry.addBreadcrumb({
      message: `External API call completed: ${apiName}`,
      category: 'external_api',
      level: 'info',
      data: {
        api: apiName,
        duration,
        status: 'success'
      }
    })
    
    return result
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag('component', 'external_api')
      scope.setTag('api_name', apiName)
      scope.setExtra('endpoint', endpoint || 'unknown')
      scope.setExtra('duration', Date.now() - startTime)
      
      Sentry.captureException(error)
    })
    
    throw error
  }
}
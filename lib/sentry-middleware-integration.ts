/**
 * Sentry 中间件集成
 * 在现有 middleware.ts 中添加错误和性能监控
 */

import { NextRequest, NextResponse, NextMiddleware, NextFetchEvent } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import * as Sentry from '@sentry/nextjs'

/**
 * 包装现有中间件以添加 Sentry 监控
 */
export function withSentryMiddleware(
  middleware: NextMiddleware
): NextMiddleware {
  return async (request: NextRequest, event: NextFetchEvent) => {
    const startTime = Date.now()
    
    // 添加请求面包屑
    Sentry.addBreadcrumb({
      message: `Middleware processing: ${request.nextUrl.pathname}`,
      category: 'middleware',
      level: 'info',
      data: {
        url: request.nextUrl.href,
        method: request.method,
        userAgent: request.headers.get('user-agent')
      }
    })

    try {
      const response = await middleware(request, event)
      
      // 如果中间件没有返回响应，创建一个默认的继续响应
      if (!response) {
        return NextResponse.next()
      }
      
      // 记录性能指标
      const duration = Date.now() - startTime
      if (duration > 1000) { // 超过1秒的请求
        Sentry.addBreadcrumb({
          message: 'Slow middleware execution',
          category: 'performance',
          level: 'warning',
          data: {
            duration,
            path: request.nextUrl.pathname
          }
        })
      }

      return response
    } catch (error) {
      // 捕获中间件错误
      Sentry.withScope((scope) => {
        scope.setTag('component', 'middleware')
        scope.setTag('path', request.nextUrl.pathname)
        scope.setExtra('url', request.nextUrl.href)
        scope.setExtra('method', request.method)
        scope.setExtra('headers', Object.fromEntries(request.headers.entries()))
        Sentry.captureException(error)
      })
      
      throw error
    }
  }
}

/**
 * 认证错误监控
 */
export async function monitorAuthErrors(request: NextRequest) {
  try {
    const authResult = await auth()
    const userId = authResult.userId
    
    if (!userId && isProtectedRoute(request.nextUrl.pathname)) {
      Sentry.addBreadcrumb({
        message: 'Unauthorized access attempt',
        category: 'auth',
        level: 'warning',
        data: {
          path: request.nextUrl.pathname,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent')
        }
      })
    }
    
    return userId
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag('component', 'auth')
      scope.setTag('operation', 'user-verification')
      scope.setExtra('path', request.nextUrl.pathname)
      Sentry.captureException(error)
    })
    throw error
  }
}

/**
 * 图片保护监控
 */
export function monitorImageProtection(request: NextRequest) {
  const referer = request.headers.get('referer')
  const isHotlinking = referer && !referer.includes(request.nextUrl.hostname)
  
  if (isHotlinking) {
    Sentry.addBreadcrumb({
      message: 'Image hotlinking detected',
      category: 'security',
      level: 'warning',
      data: {
        referer,
        imagePath: request.nextUrl.pathname,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      }
    })
  }
}

// 辅助函数
function isProtectedRoute(pathname: string): boolean {
  const protectedPaths = ['/dashboard', '/admin', '/profile']
  return protectedPaths.some(path => pathname.startsWith(path))
}
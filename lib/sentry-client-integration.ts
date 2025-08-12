/**
 * Sentry 客户端集成
 * 为客户端组件添加错误和性能监控
 */

'use client'

import * as Sentry from '@sentry/nextjs'
import React, { useEffect } from 'react'

/**
 * React 组件错误边界包装器
 */
export function withComponentMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function MonitoredComponent(props: P) {
    useEffect(() => {
      Sentry.addBreadcrumb({
        message: `Component mounted: ${componentName}`,
        category: 'ui',
        level: 'info',
        data: {
          component: componentName
        }
      })
      
      return () => {
        Sentry.addBreadcrumb({
          message: `Component unmounted: ${componentName}`,
          category: 'ui',
          level: 'info',
          data: {
            component: componentName
          }
        })
      }
    }, [])

    try {
      return React.createElement(Component, props)
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTag('component', 'react')
        scope.setTag('component_name', componentName)
        scope.setExtra('props', props)
        Sentry.captureException(error)
      })
      
      throw error
    }
  }
}

/**
 * 用户交互监控
 */
export function trackUserInteraction(
  action: string,
  element: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    message: `User interaction: ${action}`,
    category: 'user',
    level: 'info',
    data: {
      action,
      element,
      ...data
    }
  })
}

/**
 * 表单错误监控
 */
export function trackFormError(
  formName: string,
  fieldName: string,
  error: string
) {
  Sentry.withScope((scope) => {
    scope.setTag('component', 'form')
    scope.setTag('form_name', formName)
    scope.setTag('field_name', fieldName)
    scope.setLevel('warning')
    
    Sentry.captureMessage(`Form validation error: ${error}`, 'warning')
  })
}

/**
 * 网络请求监控
 */
export async function monitorClientApiCall<T>(
  apiCall: () => Promise<T>,
  endpoint: string,
  method: string = 'GET'
): Promise<T> {
  const startTime = Date.now()
  
  Sentry.addBreadcrumb({
    message: `Client API call: ${method} ${endpoint}`,
    category: 'http',
    level: 'info',
    data: {
      method,
      endpoint
    }
  })

  try {
    const result = await apiCall()
    
    const duration = Date.now() - startTime
    Sentry.addBreadcrumb({
      message: `Client API call completed: ${endpoint}`,
      category: 'http',
      level: 'info',
      data: {
        method,
        endpoint,
        duration,
        status: 'success'
      }
    })
    
    return result
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag('component', 'client_api')
      scope.setTag('endpoint', endpoint)
      scope.setTag('method', method)
      scope.setExtra('duration', Date.now() - startTime)
      
      Sentry.captureException(error)
    })
    
    throw error
  }
}

/**
 * 页面性能监控 Hook
 */
export function usePagePerformanceTracking(pageName: string) {
  useEffect(() => {
    const startTime = performance.now()
    
    // 监控页面加载时间
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navigationEntry = entry as PerformanceNavigationTiming
          
          Sentry.addBreadcrumb({
            message: `Page performance: ${pageName}`,
            category: 'performance',
            level: 'info',
            data: {
              page: pageName,
              loadTime: navigationEntry.loadEventEnd - navigationEntry.loadEventStart,
              domContentLoaded: navigationEntry.domContentLoadedEventEnd - navigationEntry.domContentLoadedEventStart,
              firstPaint: navigationEntry.responseEnd - navigationEntry.requestStart
            }
          })
        }
      })
    })
    
    observer.observe({ entryTypes: ['navigation'] })
    
    return () => {
      observer.disconnect()
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      if (duration > 3000) { // 页面停留超过3秒
        Sentry.addBreadcrumb({
          message: `Long page session: ${pageName}`,
          category: 'performance',
          level: 'info',
          data: {
            page: pageName,
            sessionDuration: duration
          }
        })
      }
    }
  }, [pageName])
}

/**
 * 图片加载错误监控
 */
export function trackImageError(src: string, alt?: string) {
  Sentry.withScope((scope) => {
    scope.setTag('component', 'image')
    scope.setTag('image_src', src)
    scope.setLevel('warning')
    
    Sentry.captureMessage(`Image load failed: ${src}`, 'warning')
    
    Sentry.addBreadcrumb({
      message: 'Image load error',
      category: 'ui',
      level: 'warning',
      data: {
        src,
        alt: alt || 'no alt text'
      }
    })
  })
}

/**
 * 路由变化监控
 */
export function trackRouteChange(from: string, to: string) {
  Sentry.addBreadcrumb({
    message: `Route change: ${from} -> ${to}`,
    category: 'navigation',
    level: 'info',
    data: {
      from,
      to
    }
  })
}

/**
 * 客户端错误处理
 */
export function handleClientError(
  error: Error,
  context: {
    component?: string
    action?: string
    userId?: string
  } = {}
) {
  Sentry.withScope((scope) => {
    scope.setTag('component', context.component || 'unknown')
    
    if (context.action) {
      scope.setTag('action', context.action)
    }
    
    if (context.userId) {
      scope.setUser({ id: context.userId })
    }
    
    scope.setLevel('error')
    Sentry.captureException(error)
  })
}
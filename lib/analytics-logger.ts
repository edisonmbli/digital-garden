/**
 * Analytics Logger - 基于现有ClientLogger的Analytics扩展
 *
 * 这个模块扩展了现有的ClientLogger系统，增加了专门的Analytics功能
 * 复用了批量处理、防重复、队列管理等核心机制
 *
 * 设计理念：
 * 1. 复用现有基础设施，降低开发成本
 * 2. 渐进式升级，保持向后兼容
 * 3. 数据自主权，避免第三方依赖
 * 4. 隐私友好，服务端处理敏感信息
 */

import { clientLogger } from './logger'

// Analytics事件接口
interface AnalyticsEvent {
  eventName: string
  timestamp: string
  sessionId: string
  userId?: string
  page: string
  referrer?: string
  userAgent: string
  properties?: Record<string, unknown>
  performance?: {
    loadTime?: number
    fcp?: number
    lcp?: number
    cls?: number
    fid?: number
    ttfb?: number
  }
}

// Analytics配置接口
interface AnalyticsConfig {
  batchSize: number
  batchDelay: number
  maxQueueSize: number
  duplicateWindow: number
  enablePerformanceTracking: boolean
  enableAutoPageTracking: boolean
}

/**
 * Analytics Logger 类
 * 基于现有ClientLogger架构，专门用于用户行为分析
 */
export class AnalyticsLogger {
  private isClient = typeof window !== 'undefined'
  private sessionId: string
  private userId: string | undefined = undefined
  private queue: AnalyticsEvent[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private recentEvents = new Set<string>()
  private performanceObserver: PerformanceObserver | null = null

  // 配置参数
  private readonly config: AnalyticsConfig = {
    batchSize: 20,
    batchDelay: 5000,
    maxQueueSize: 50,
    duplicateWindow: 3000,
    enablePerformanceTracking: true,
    enableAutoPageTracking: true,
  }

  constructor(customConfig?: Partial<AnalyticsConfig>) {
    // 合并自定义配置
    if (customConfig) {
      this.config = { ...this.config, ...customConfig }
    }

    this.sessionId = this.generateSessionId()

    if (this.isClient) {
      this.initializeTracking()
      this.setupCleanup()
    }
  }

  /**
   * 初始化各种追踪功能
   */
  private initializeTracking(): void {
    if (this.config.enablePerformanceTracking) {
      this.initializePerformanceTracking()
    }

    if (this.config.enableAutoPageTracking) {
      this.setupPageTracking()
    }

    // 追踪初始页面加载
    if (document.readyState === 'complete') {
      this.trackPageView()
    } else {
      window.addEventListener('load', () => {
        this.trackPageView()
      })
    }
  }

  /**
   * 设置页面卸载时的清理
   */
  private setupCleanup(): void {
    window.addEventListener('beforeunload', () => {
      this.flush()
    })

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush()
      }
    })
  }

  /**
   * 追踪自定义事件
   */
  track(eventName: string, properties?: Record<string, unknown>): void {
    if (!this.isClient) return

    const event: AnalyticsEvent = {
      eventName,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.getCurrentUserId(),
      page: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      properties: {
        ...properties,
        // 添加客户端时区偏移信息（分钟）
        timezoneOffset: new Date().getTimezoneOffset()
      },
    }

    this.queueEvent(event)
  }

  /**
   * 追踪页面访问
   */
  trackPageView(page?: string, properties?: Record<string, unknown>): void {
    const pageUrl = page || window.location.pathname

    this.track('page_view', {
      page: pageUrl,
      title: document.title,
      search: window.location.search,
      hash: window.location.hash,
      ...properties,
    })
  }

  /**
   * 追踪用户交互事件
   */
  trackInteraction(
    element: string,
    action: string,
    properties?: Record<string, unknown>
  ): void {
    this.track('user_interaction', {
      element,
      action,
      ...properties,
    })
  }

  /**
   * 追踪业务事件（复用现有ClientLogger的业务逻辑）
   */
  trackBusinessEvent(
    eventType: 'like' | 'comment' | 'share' | 'download',
    context: {
      postId?: string
      collectionId?: string
      userId?: string
      action?: string
      [key: string]: unknown
    }
  ): void {
    // 同时发送到Analytics和现有的业务日志系统
    this.track(`business_${eventType}`, context)

    // 根据事件类型调用现有的ClientLogger方法
    if (eventType === 'download' && context.postId) {
      clientLogger.logImageAccess('download', {
        userId: context.userId,
        postId: context.postId,
        collectionId: context.collectionId,
      })
    }
  }

  /**
   * 追踪页面浏览事件（专门用于post view）
   */
  trackPostView(
    postId: string,
    postType: 'photo' | 'log',
    context?: {
      collectionId?: string
      title?: string
      [key: string]: unknown
    }
  ): void {
    this.track('post_view', {
      postId,
      postType,
      ...context,
    })
  }

  /**
   * 追踪点赞事件
   */
  trackLike(
    postId: string,
    action: 'like' | 'unlike',
    context?: {
      collectionId?: string
      [key: string]: unknown
    }
  ): void {
    this.trackBusinessEvent('like', {
      postId,
      action,
      ...context,
    })
  }

  /**
   * 追踪评论事件
   */
  trackComment(
    postId: string,
    context?: {
      commentLength?: number
      parentId?: string
      [key: string]: unknown
    }
  ): void {
    this.trackBusinessEvent('comment', {
      postId,
      ...context,
    })
  }

  /**
   * 追踪错误事件
   */
  trackError(error: Error, context?: Record<string, unknown>): void {
    this.track('error', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      ...context,
    })
  }

  /**
   * 追踪性能指标
   */
  trackPerformance(
    metric: string,
    value: number,
    context?: Record<string, unknown>
  ): void {
    this.track('performance_metric', {
      metric,
      value,
      url: window.location.href,
      ...context,
    })
  }

  /**
   * 设置用户属性
   */
  identify(userId: string, traits?: Record<string, unknown>): void {
    this.track('identify', {
      userId,
      traits,
    })
  }

  /**
   * 设置用户ID（从客户端组件调用）
   */
  setUserId(userId: string | undefined): void {
    this.userId = userId
  }

  /**
   * 获取当前用户ID
   */
  getUserId(): string | undefined {
    return this.userId
  }

  /**
   * 获取当前会话ID
   */
  getSessionId(): string {
    return this.sessionId
  }

  /**
   * 获取队列中的事件数量
   */
  getQueueSize(): number {
    return this.queue.length
  }

  /**
   * 追踪性能指标的内部方法
   */
  private trackPerformanceMetric(metric: string, value: number): void {
    this.trackPerformance(metric, value)
  }

  /**
   * 将事件添加到队列
   */
  private queueEvent(event: AnalyticsEvent): void {
    // 防重复检查
    const eventKey = this.generateEventKey(event)
    if (this.recentEvents.has(eventKey)) {
      return
    }

    // 添加到防重复集合
    this.recentEvents.add(eventKey)
    setTimeout(() => {
      this.recentEvents.delete(eventKey)
    }, this.config.duplicateWindow)

    // 添加到队列
    this.queue.push(event)

    // 队列满时立即处理
    if (this.queue.length >= this.config.batchSize) {
      this.processBatch()
      return
    }

    // 队列溢出保护
    if (this.queue.length > this.config.maxQueueSize) {
      this.queue.shift()
    }

    // 设置定时批量处理
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }

    this.batchTimer = setTimeout(() => {
      this.processBatch()
    }, this.config.batchDelay)
  }

  /**
   * 处理批量事件
   */
  private async processBatch(): Promise<void> {
    if (this.queue.length === 0) return

    // 清除定时器
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    // 取出当前队列中的所有事件
    const eventsToSend = [...this.queue]
    this.queue = []

    try {
      await this.sendBatchEvents(eventsToSend)
    } catch (error) {
      console.error('Failed to process analytics batch:', error)
      // 重新加入队列以便重试
      this.queue.unshift(...eventsToSend)
    }
  }

  /**
   * 发送批量事件到服务端
   */
  private async sendBatchEvents(events: AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return

    const data = JSON.stringify(events)

    // 优先使用 sendBeacon API
    if (navigator.sendBeacon) {
      const success = navigator.sendBeacon('/api/analytics', data)
      if (success) return
    }

    // 降级到 fetch
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data,
        keepalive: true,
      })

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.statusText}`)
      }
    } catch (error) {
      console.warn('Failed to send analytics events:', error)
      throw error
    }
  }

  /**
   * 立即处理队列中的所有事件
   */
  public async flush(): Promise<void> {
    if (this.queue.length > 0) {
      await this.processBatch()
    }

    // 清理定时器
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      let sessionId = sessionStorage.getItem('analytics_session_id')
      if (!sessionId) {
        sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        sessionStorage.setItem('analytics_session_id', sessionId)
      }
      return sessionId
    }
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取当前用户ID（内部方法）
   */
  private getCurrentUserId(): string | undefined {
    // 优先使用显式设置的用户ID
    if (this.userId) {
      return this.userId
    }

    // 如果没有设置，尝试从Clerk的全局状态获取
    if (typeof window !== 'undefined') {
      try {
        // 尝试从Clerk的全局状态获取
        const clerkGlobal = (
          window as unknown as { __clerk_user?: { id: string } }
        ).__clerk_user
        if (clerkGlobal?.id) {
          return clerkGlobal.id
        }

        // 尝试从Clerk实例获取
        const clerkInstance = (
          window as unknown as { Clerk?: { user?: { id: string } } }
        ).Clerk
        if (clerkInstance?.user?.id) {
          return clerkInstance.user.id
        }
      } catch (error) {
        console.warn('Failed to get user ID from Clerk:', error)
      }
    }

    return undefined
  }

  /**
   * 生成事件的唯一标识
   */
  private generateEventKey(event: AnalyticsEvent): string {
    const { eventName, userId, page, properties } = event
    const propsKey = properties ? JSON.stringify(properties) : ''
    return `${eventName}-${userId || 'anonymous'}-${page}-${propsKey}`
  }

  /**
   * 初始化性能监控
   */
  private initializePerformanceTracking(): void {
    if (!this.isClient) return

    // 简化的性能监控
    if (typeof window !== 'undefined' && 'performance' in window) {
      // 监听页面加载完成
      window.addEventListener('load', () => {
        const loadTime = performance.now()
        this.trackPerformanceMetric('page_load_time', loadTime)

        // Navigation Timing API
        setTimeout(() => {
          const navigation = performance.getEntriesByType(
            'navigation'
          )[0] as PerformanceNavigationTiming
          if (navigation) {
            this.trackPerformance(
              'dom_content_loaded',
              navigation.domContentLoadedEventEnd - navigation.fetchStart
            )
            this.trackPerformance(
              'first_byte',
              navigation.responseStart - navigation.fetchStart
            )
          }
        }, 0)
      })
    }
  }

  /**
   * 设置页面路由变化监听
   */
  private setupPageTracking(): void {
    if (typeof window === 'undefined') return

    let currentPath = window.location.pathname

    // 监听popstate事件（浏览器前进后退）
    window.addEventListener('popstate', () => {
      if (window.location.pathname !== currentPath) {
        currentPath = window.location.pathname
        this.trackPageView()
      }
    })

    // 监听pushState和replaceState（SPA路由变化）
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState

    history.pushState = function (...args) {
      originalPushState.apply(history, args)
      setTimeout(() => {
        if (window.location.pathname !== currentPath) {
          currentPath = window.location.pathname
          analytics.trackPageView()
        }
      }, 0)
    }

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args)
      setTimeout(() => {
        if (window.location.pathname !== currentPath) {
          currentPath = window.location.pathname
          analytics.trackPageView()
        }
      }, 0)
    }
  }
}

// 创建全局实例
export const analytics = new AnalyticsLogger()

// 便捷方法导出
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
) {
  analytics.track(eventName, properties)
}

export function trackPageView(
  page?: string,
  properties?: Record<string, unknown>
) {
  analytics.trackPageView(page, properties)
}

export function trackCommentSubmit(
  postId: string,
  properties?: Record<string, unknown>
) {
  analytics.trackBusinessEvent('comment', { postId, ...properties })
}

export function trackLikeButton(
  postId: string,
  action: 'like' | 'unlike',
  properties?: Record<string, unknown>
) {
  analytics.track('like_button', { postId, action, ...properties })
}

export function trackImageView(
  postId: string,
  collectionId?: string,
  properties?: Record<string, unknown>
) {
  analytics.track('image_view', { 
    postId, 
    collectionId, 
    type: 'image',
    action: 'view',
    ...properties 
  })
}

export function trackImageDownload(
  postId: string,
  collectionId?: string,
  properties?: Record<string, unknown>
) {
  analytics.trackBusinessEvent('download', {
    postId,
    collectionId,
    ...properties,
  })
}

export function trackShare(
  postId: string,
  platform: string,
  properties?: Record<string, unknown>
) {
  analytics.trackBusinessEvent('share', { postId, platform, ...properties })
}

export function trackError(error: Error, context?: Record<string, unknown>) {
  analytics.trackError(error, context)
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  analytics.identify(userId, traits)
}

// 导出类型
export type { AnalyticsEvent, AnalyticsConfig }

// 使用示例：
/*
import { analytics, trackEvent, trackCommentSubmit } from '@/lib/analytics-logger'

// 基础事件追踪
trackEvent('button_click', { buttonName: 'subscribe', location: 'header' })

// 业务事件追踪
trackCommentSubmit('post-123', { commentLength: 150 })

// 用户识别
analytics.identify('user-456', { plan: 'premium', signupDate: '2024-01-01' })

// 错误追踪
try {
  // 一些可能出错的代码
} catch (error) {
  analytics.trackError(error, { context: 'comment_submission' })
}

// 自定义性能监控
const startTime = Date.now()
// 执行一些操作
analytics.trackPerformance('custom_operation', Date.now() - startTime)
*/

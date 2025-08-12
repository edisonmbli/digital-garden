// lib/performance-monitor.ts
/**
 * 性能监控工具
 * 集成 Sentry 性能监控和现有分析系统
 */

import { sentryIntegration } from './sentry-integration'
import { analytics } from './analytics-logger'
import { logger } from './logger'

interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count' | 'percentage'
  threshold?: number
  context?: Record<string, unknown>
}

interface WebVitalsMetric {
  name: 'CLS' | 'INP' | 'FCP' | 'LCP' | 'TTFB'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
}

class PerformanceMonitor {
  private isClient = typeof window !== 'undefined'
  private isProduction = process.env.NODE_ENV === 'production'
  private metrics: Map<string, PerformanceMetric> = new Map()
  private observers: PerformanceObserver[] = []
  
  // 性能阈值配置
  private readonly thresholds = {
    // Web Vitals 阈值
    pageLoad: 3000, // 3秒
    firstContentfulPaint: 1800, // 1.8秒
    largestContentfulPaint: 2500, // 2.5秒
    interactionToNextPaint: 200, // 200ms
    cumulativeLayoutShift: 0.1, // 0.1
    
    // API 响应时间
    apiResponse: 1000, // 1秒
    databaseQuery: 500, // 500ms
    
    // 资源加载
    imageLoad: 2000, // 2秒
    scriptLoad: 1000, // 1秒
    
    // 内存使用
    memoryUsage: 50 * 1024 * 1024, // 50MB
  }

  constructor() {
    if (this.isClient) {
      this.initializeWebVitals()
      this.initializeResourceTiming()
      this.initializeNavigationTiming()
      this.initializeMemoryMonitoring()
    }
  }

  /**
   * 初始化 Web Vitals 监控
   */
  private initializeWebVitals(): void {
    // 动态导入 web-vitals 以避免 SSR 问题
    import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(this.handleWebVital.bind(this))
      onINP(this.handleWebVital.bind(this))
      onFCP(this.handleWebVital.bind(this))
      onLCP(this.handleWebVital.bind(this))
      onTTFB(this.handleWebVital.bind(this))
    }).catch(error => {
      logger.warn('PerformanceMonitor', 'Failed to load web-vitals', {
        error: error.message
      })
    })
  }

  /**
   * 处理 Web Vitals 指标
   */
  private handleWebVital(metric: WebVitalsMetric): void {
    const threshold = this.getWebVitalThreshold(metric.name)
    const isSlowMetric = metric.value > threshold
    
    // 记录到本地日志
    logger.performance(
      'WebVitals',
      metric.name,
      metric.value,
      {
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        threshold,
        isSlowMetric,
        url: window.location.href
      }
    )
    
    // 记录到 Analytics
    analytics.trackPerformance(`web_vital_${metric.name.toLowerCase()}`, metric.value, {
      rating: metric.rating,
      threshold,
      isSlowMetric
    })
    
    // 如果性能指标超过阈值，报告给 Sentry
    if (isSlowMetric) {
      sentryIntegration.capturePerformanceIssue(
        `WebVital: ${metric.name}`,
        metric.value,
        threshold,
        {
          module: 'WebVitals',
          url: window.location.href,
          additionalData: {
            rating: metric.rating,
            delta: metric.delta,
            id: metric.id
          }
        }
      )
    }
  }

  /**
   * 获取 Web Vital 阈值
   */
  private getWebVitalThreshold(name: string): number {
    switch (name) {
      case 'CLS': return this.thresholds.cumulativeLayoutShift
      case 'INP': return this.thresholds.interactionToNextPaint
      case 'FCP': return this.thresholds.firstContentfulPaint
      case 'LCP': return this.thresholds.largestContentfulPaint
      case 'TTFB': return this.thresholds.pageLoad
      default: return 1000
    }
  }

  /**
   * 初始化资源加载时间监控
   */
  private initializeResourceTiming(): void {
    if (!('PerformanceObserver' in window)) return

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          this.handleResourceTiming(entry as PerformanceResourceTiming)
        }
      }
    })

    observer.observe({ entryTypes: ['resource'] })
    this.observers.push(observer)
  }

  /**
   * 处理资源加载时间
   */
  private handleResourceTiming(entry: PerformanceResourceTiming): void {
    const duration = entry.responseEnd - entry.startTime
    const resourceType = this.getResourceType(entry.name)
    const threshold = this.getResourceThreshold(resourceType)
    
    if (duration > threshold) {
      logger.performance(
        'ResourceTiming',
        `${resourceType}_load`,
        duration,
        {
          url: entry.name,
          size: entry.transferSize,
          threshold,
          initiatorType: entry.initiatorType
        }
      )
      
      sentryIntegration.capturePerformanceIssue(
        `Slow ${resourceType} load`,
        duration,
        threshold,
        {
          module: 'ResourceTiming',
          url: window.location.href,
          additionalData: {
            resourceUrl: entry.name,
            resourceType,
            size: entry.transferSize,
            initiatorType: entry.initiatorType
          }
        }
      )
    }
  }

  /**
   * 获取资源类型
   */
  private getResourceType(url: string): string {
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'image'
    if (url.match(/\.(js|mjs)$/i)) return 'script'
    if (url.match(/\.css$/i)) return 'stylesheet'
    if (url.match(/\.(woff|woff2|ttf|otf)$/i)) return 'font'
    if (url.includes('/api/')) return 'api'
    return 'other'
  }

  /**
   * 获取资源阈值
   */
  private getResourceThreshold(type: string): number {
    switch (type) {
      case 'image': return this.thresholds.imageLoad
      case 'script': return this.thresholds.scriptLoad
      case 'api': return this.thresholds.apiResponse
      default: return 2000
    }
  }

  /**
   * 初始化导航时间监控
   */
  private initializeNavigationTiming(): void {
    if (!('PerformanceObserver' in window)) return

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          this.handleNavigationTiming(entry as PerformanceNavigationTiming)
        }
      }
    })

    observer.observe({ entryTypes: ['navigation'] })
    this.observers.push(observer)
  }

  /**
   * 处理导航时间
   */
  private handleNavigationTiming(entry: PerformanceNavigationTiming): void {
    const metrics = {
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      totalPageLoad: entry.loadEventEnd - entry.fetchStart,
      dnsLookup: entry.domainLookupEnd - entry.domainLookupStart,
      tcpConnection: entry.connectEnd - entry.connectStart,
      serverResponse: entry.responseEnd - entry.requestStart
    }

    Object.entries(metrics).forEach(([name, value]) => {
      if (value > 0) {
        const threshold = name === 'totalPageLoad' ? this.thresholds.pageLoad : 1000
        
        logger.performance(
          'NavigationTiming',
          name,
          value,
          {
            threshold,
            url: window.location.href,
            navigationType: entry.type
          }
        )
        
        if (value > threshold) {
          sentryIntegration.capturePerformanceIssue(
            `Slow ${name}`,
            value,
            threshold,
            {
              module: 'NavigationTiming',
              url: window.location.href,
              additionalData: {
                navigationType: entry.type,
                allMetrics: metrics
              }
            }
          )
        }
      }
    })
  }

  /**
   * 初始化内存监控
   */
  private initializeMemoryMonitoring(): void {
    if (!('memory' in performance)) return

    // 每30秒检查一次内存使用情况
    setInterval(() => {
      const memory = (performance as Performance & {
        memory?: {
          usedJSHeapSize: number
          totalJSHeapSize: number
          jsHeapSizeLimit: number
        }
      }).memory as {
        usedJSHeapSize: number
        totalJSHeapSize: number
        jsHeapSizeLimit: number
      } | undefined
      if (memory) {
        const usedMemory = memory.usedJSHeapSize
        const threshold = this.thresholds.memoryUsage
        
        if (usedMemory > threshold) {
          logger.performance(
            'MemoryMonitoring',
            'memory_usage',
            usedMemory,
            {
              totalHeapSize: memory.totalJSHeapSize,
              heapSizeLimit: memory.jsHeapSizeLimit,
              threshold,
              url: window.location.href
            }
          )
          
          sentryIntegration.capturePerformanceIssue(
            'High memory usage',
            usedMemory,
            threshold,
            {
              module: 'MemoryMonitoring',
              url: window.location.href,
              additionalData: {
                totalHeapSize: memory.totalJSHeapSize,
                heapSizeLimit: memory.jsHeapSizeLimit,
                usagePercentage: (usedMemory / memory.jsHeapSizeLimit) * 100
              }
            }
          )
        }
      }
    }, 30000)
  }

  /**
   * 手动记录性能指标
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.set(metric.name, metric)
    
    logger.performance(
      'CustomMetric',
      metric.name,
      metric.value,
      {
        unit: metric.unit,
        threshold: metric.threshold,
        ...metric.context
      }
    )
    
    analytics.trackPerformance(metric.name, metric.value, {
      unit: metric.unit,
      threshold: metric.threshold,
      ...metric.context
    })
    
    // 如果有阈值且超过阈值，报告给 Sentry
    if (metric.threshold && metric.value > metric.threshold) {
      sentryIntegration.capturePerformanceIssue(
        metric.name,
        metric.value,
        metric.threshold,
        {
          module: 'CustomMetric',
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          additionalData: {
            unit: metric.unit,
            ...metric.context
          }
        }
      )
    }
  }

  /**
   * 测量函数执行时间
   */
  async measureFunction<T>(
    name: string,
    fn: () => Promise<T> | T,
    threshold?: number
  ): Promise<T> {
    const startTime = performance.now()
    
    try {
      const result = await fn()
      const duration = performance.now() - startTime
      
      this.recordMetric({
        name: `function_${name}`,
        value: duration,
        unit: 'ms',
        threshold,
        context: {
          success: true
        }
      })
      
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      
      this.recordMetric({
        name: `function_${name}`,
        value: duration,
        unit: 'ms',
        threshold,
        context: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      
      throw error
    }
  }

  /**
   * 获取当前性能指标
   */
  getMetrics(): Record<string, PerformanceMetric> {
    return Object.fromEntries(this.metrics)
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.metrics.clear()
  }
}

// 创建全局实例
export const performanceMonitor = new PerformanceMonitor()

// 便捷函数
export const recordPerformanceMetric = (metric: PerformanceMetric) => 
  performanceMonitor.recordMetric(metric)

export const measureFunction = <T>(
  name: string,
  fn: () => Promise<T> | T,
  threshold?: number
) => performanceMonitor.measureFunction(name, fn, threshold)

export type { PerformanceMetric, WebVitalsMetric }
// lib/business-monitor.ts
/**
 * 业务逻辑监控点
 * 监控关键业务流程和用户行为
 */

import { sentryIntegration } from './sentry-integration'
import { analytics } from './analytics-logger'
import { logger } from './logger'
import { auth } from '@clerk/nextjs/server'

interface BusinessEvent {
  action: string
  category: 'user_action' | 'system_event' | 'business_flow' | 'error_recovery'
  severity: 'low' | 'medium' | 'high' | 'critical'
  metadata?: Record<string, unknown>
  userId?: string
  sessionId?: string
  timestamp?: Date
}

interface BusinessMetric {
  name: string
  value: number
  unit: string
  target?: number
  context?: Record<string, unknown>
}

interface UserJourney {
  journeyId: string
  userId?: string
  steps: Array<{
    step: string
    timestamp: Date
    duration?: number
    success: boolean
    metadata?: Record<string, unknown>
  }>
  startTime: Date
  endTime?: Date
  status: 'in_progress' | 'completed' | 'abandoned' | 'failed'
}

class BusinessMonitor {
  private journeys: Map<string, UserJourney> = new Map()
  private metrics: Map<string, BusinessMetric> = new Map()
  
  // 业务指标阈值
  private readonly thresholds = {
    // 用户行为
    sessionDuration: 30 * 60 * 1000, // 30分钟
    pageViewDuration: 5 * 60 * 1000, // 5分钟
    
    // 内容交互
    likeResponseTime: 2000, // 2秒
    commentSubmissionTime: 5000, // 5秒
    searchResponseTime: 3000, // 3秒
    
    // 系统性能
    apiErrorRate: 0.05, // 5%
    databaseQueryTime: 1000, // 1秒
    
    // 业务转化
    registrationAbandonmentRate: 0.3, // 30%
    contentEngagementRate: 0.1, // 10%
  }

  /**
   * 记录业务事件
   */
  async recordBusinessEvent(event: BusinessEvent): Promise<void> {
    const { userId } = await auth()
    const enrichedEvent = {
      ...event,
      userId: event.userId || userId || 'anonymous',
      timestamp: event.timestamp || new Date(),
      sessionId: event.sessionId || this.generateSessionId()
    }

    // 记录到日志系统
    logger.info('BusinessMonitor', `Business event: ${event.action}`, {
      category: event.category,
      severity: event.severity,
      metadata: event.metadata,
      userId: enrichedEvent.userId
    })

    // 记录到分析系统
    analytics.trackBusinessEvent(
      event.action as 'like' | 'comment' | 'share' | 'download',
      {
        ...event.metadata,
        userId: enrichedEvent.userId,
        sessionId: enrichedEvent.sessionId
      }
    )

    // 高严重性事件发送到 Sentry
    if (event.severity === 'high' || event.severity === 'critical') {
      sentryIntegration.captureBusinessEvent({
        type: event.category === 'user_action' ? 'user_action' : 'system_event',
        action: event.action,
        severity: event.severity === 'critical' ? 'error' : 'warning',
        context: {
          module: 'BusinessMonitor',
          userId: enrichedEvent.userId,
          additionalData: {
            ...event.metadata,
            sessionId: enrichedEvent.sessionId
          }
        }
      })
    }
  }

  /**
   * 开始用户旅程追踪
   */
  async startUserJourney(journeyId: string, initialStep: string): Promise<void> {
    const { userId } = await auth()
    
    const journey: UserJourney = {
      journeyId,
      userId: userId || undefined,
      steps: [{
        step: initialStep,
        timestamp: new Date(),
        success: true
      }],
      startTime: new Date(),
      status: 'in_progress'
    }

    this.journeys.set(journeyId, journey)

    await this.recordBusinessEvent({
      action: 'journey_started',
      category: 'user_action',
      severity: 'low',
      metadata: {
        journeyId,
        initialStep,
        userId: journey.userId
      }
    })
  }

  /**
   * 添加用户旅程步骤
   */
  async addJourneyStep(
    journeyId: string,
    step: string,
    success: boolean = true,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const journey = this.journeys.get(journeyId)
    if (!journey) {
      logger.warn('BusinessMonitor', `Journey not found: ${journeyId}`)
      return
    }

    const previousStep = journey.steps[journey.steps.length - 1]
    const now = new Date()
    const duration = now.getTime() - previousStep.timestamp.getTime()

    journey.steps.push({
      step,
      timestamp: now,
      duration,
      success,
      metadata
    })

    // 如果步骤失败，标记旅程为失败
    if (!success) {
      journey.status = 'failed'
      journey.endTime = now
    }

    await this.recordBusinessEvent({
      action: 'journey_step',
      category: 'user_action',
      severity: success ? 'low' : 'medium',
      metadata: {
        journeyId,
        step,
        success,
        duration,
        totalSteps: journey.steps.length,
        ...metadata
      }
    })
  }

  /**
   * 完成用户旅程
   */
  async completeUserJourney(
    journeyId: string,
    success: boolean = true
  ): Promise<void> {
    const journey = this.journeys.get(journeyId)
    if (!journey) {
      logger.warn('BusinessMonitor', `Journey not found: ${journeyId}`)
      return
    }

    const now = new Date()
    journey.endTime = now
    journey.status = success ? 'completed' : 'failed'

    const totalDuration = now.getTime() - journey.startTime.getTime()
    const totalSteps = journey.steps.length
    const successfulSteps = journey.steps.filter(s => s.success).length
    const successRate = successfulSteps / totalSteps

    await this.recordBusinessEvent({
      action: 'journey_completed',
      category: 'business_flow',
      severity: success ? 'low' : 'medium',
      metadata: {
        journeyId,
        success,
        totalDuration,
        totalSteps,
        successfulSteps,
        successRate,
        userId: journey.userId
      }
    })

    // 清理已完成的旅程
    this.journeys.delete(journeyId)
  }

  /**
   * 监控内容交互
   */
  async monitorContentInteraction(
    action: 'like' | 'comment' | 'share' | 'view',
    contentId: string,
    duration?: number
  ): Promise<void> {
    const { userId } = await auth()
    const threshold = this.getInteractionThreshold(action)
    
    await this.recordBusinessEvent({
      action: `content_${action}`,
      category: 'user_action',
      severity: 'low',
      metadata: {
        contentId,
        duration,
        threshold,
        isSlowInteraction: duration ? duration > threshold : false,
        userId
      }
    })

    // 如果交互时间过长，记录性能问题
    if (duration && duration > threshold) {
      sentryIntegration.capturePerformanceIssue(
        `Slow content ${action}`,
        duration,
        threshold,
        {
          module: 'ContentInteraction',
          additionalData: {
            contentId,
            action,
            userId
          }
        }
      )
    }
  }

  /**
   * 监控搜索行为
   */
  async monitorSearch(
    query: string,
    resultsCount: number,
    responseTime: number,
    userClicked: boolean = false
  ): Promise<void> {
    const { userId } = await auth()
    const threshold = this.thresholds.searchResponseTime
    
    await this.recordBusinessEvent({
      action: 'search_performed',
      category: 'user_action',
      severity: 'low',
      metadata: {
        query: query.substring(0, 100), // 限制查询长度
        resultsCount,
        responseTime,
        threshold,
        userClicked,
        isSlowSearch: responseTime > threshold,
        userId
      }
    })

    // 记录搜索性能指标
    this.recordBusinessMetric({
      name: 'search_response_time',
      value: responseTime,
      unit: 'ms',
      target: threshold,
      context: {
        resultsCount,
        userClicked,
        userId
      }
    })
  }

  /**
   * 监控API错误率
   */
  async monitorApiError(
    endpoint: string,
    method: string,
    statusCode: number,
    errorMessage?: string
  ): Promise<void> {
    const { userId } = await auth()
    
    await this.recordBusinessEvent({
      action: 'api_error',
      category: 'system_event',
      severity: this.getErrorSeverity(statusCode),
      metadata: {
        endpoint,
        method,
        statusCode,
        errorMessage,
        userId
      }
    })

    // 更新错误率指标
    const errorRateKey = `api_error_rate_${endpoint}`
    const currentMetric = this.metrics.get(errorRateKey)
    const newErrorCount = currentMetric ? currentMetric.value + 1 : 1
    
    this.recordBusinessMetric({
      name: errorRateKey,
      value: newErrorCount,
      unit: 'count',
      target: this.thresholds.apiErrorRate * 100, // 转换为百分比
      context: {
        endpoint,
        method,
        statusCode
      }
    })
  }

  /**
   * 记录业务指标
   */
  recordBusinessMetric(metric: BusinessMetric): void {
    this.metrics.set(metric.name, metric)
    
    logger.info('BusinessMonitor', `Business metric: ${metric.name}`, {
      value: metric.value,
      unit: metric.unit,
      target: metric.target,
      context: metric.context
    })

    analytics.trackPerformance(metric.name, metric.value, {
      unit: metric.unit,
      target: metric.target,
      ...metric.context
    })

    // 如果指标超过目标值，发送警告
    if (metric.target && metric.value > metric.target) {
      sentryIntegration.captureBusinessEvent({
        type: 'system_event',
        action: 'metric_threshold_exceeded',
        severity: 'warning',
        context: {
          module: 'BusinessMonitor',
          additionalData: {
            metricName: metric.name,
            value: metric.value,
            target: metric.target,
            unit: metric.unit,
            ...metric.context
          }
        }
      })
    }
  }

  /**
   * 获取交互阈值
   */
  private getInteractionThreshold(action: string): number {
    switch (action) {
      case 'like': return this.thresholds.likeResponseTime
      case 'comment': return this.thresholds.commentSubmissionTime
      case 'search': return this.thresholds.searchResponseTime
      default: return 2000
    }
  }

  /**
   * 获取错误严重性
   */
  private getErrorSeverity(statusCode: number): BusinessEvent['severity'] {
    if (statusCode >= 500) return 'high'
    if (statusCode >= 400) return 'medium'
    return 'low'
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取当前指标
   */
  getMetrics(): Record<string, BusinessMetric> {
    return Object.fromEntries(this.metrics)
  }

  /**
   * 获取活跃旅程
   */
  getActiveJourneys(): UserJourney[] {
    return Array.from(this.journeys.values())
  }

  /**
   * 清理过期数据
   */
  cleanup(): void {
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24小时
    
    // 清理过期的旅程
    for (const [journeyId, journey] of this.journeys.entries()) {
      if (now - journey.startTime.getTime() > maxAge) {
        this.journeys.delete(journeyId)
      }
    }
    
    // 清理过期的指标
    this.metrics.clear()
  }
}

// 创建全局实例
export const businessMonitor = new BusinessMonitor()

// 便捷函数
export const recordBusinessEvent = (event: BusinessEvent) => 
  businessMonitor.recordBusinessEvent(event)

export const startUserJourney = (journeyId: string, initialStep: string) => 
  businessMonitor.startUserJourney(journeyId, initialStep)

export const addJourneyStep = (
  journeyId: string,
  step: string,
  success?: boolean,
  metadata?: Record<string, unknown>
) => businessMonitor.addJourneyStep(journeyId, step, success, metadata)

export const completeUserJourney = (journeyId: string, success?: boolean) => 
  businessMonitor.completeUserJourney(journeyId, success)

export const monitorContentInteraction = (
  action: 'like' | 'comment' | 'share' | 'view',
  contentId: string,
  duration?: number
) => businessMonitor.monitorContentInteraction(action, contentId, duration)

export const monitorSearch = (
  query: string,
  resultsCount: number,
  responseTime: number,
  userClicked?: boolean
) => businessMonitor.monitorSearch(query, resultsCount, responseTime, userClicked)

export const monitorApiError = (
  endpoint: string,
  method: string,
  statusCode: number,
  errorMessage?: string
) => businessMonitor.monitorApiError(endpoint, method, statusCode, errorMessage)

export const recordBusinessMetric = (metric: BusinessMetric) => 
  businessMonitor.recordBusinessMetric(metric)

export type { BusinessEvent, BusinessMetric, UserJourney }
// lib/monitoring.ts
/**
 * 监控系统统一入口
 * 集成 Sentry、性能监控、业务监控和告警系统
 */

import { sentryIntegration } from './sentry-integration'
import { performanceMonitor } from './performance-monitor'
import { businessMonitor } from './business-monitor'
import { getAlertConfig, validateAlertConfig } from './alert-config'
// Dashboard 配置在 dashboard-config.ts 中定义
import { logger } from './logger'

// 重新导出主要功能
export {
  // Sentry 集成
  sentryIntegration,
  captureError,
  captureBusinessEvent,
  capturePerformanceIssue,
  setSentryUser,
  clearSentryUser,
  addSentryBreadcrumb
} from './sentry-integration'

export {
  // 性能监控
  performanceMonitor,
  recordPerformanceMetric,
  measureFunction
} from './performance-monitor'

export {
  // 业务监控
  businessMonitor,
  recordBusinessEvent,
  startUserJourney,
  addJourneyStep,
  completeUserJourney,
  monitorContentInteraction,
  monitorSearch,
  monitorApiError,
  recordBusinessMetric
} from './business-monitor'

export {
  // 告警配置
  getAlertConfig,
  validateAlertConfig,
  formatAlertMessage
} from './alert-config'

export {
  // Dashboard 配置
  getDashboardsByCategory,
  filterDashboardsByPermission,
  canEditDashboard,
  generateSentryDashboardUrl,
  validateDashboard
} from './dashboard-config'

/**
 * 监控系统初始化配置
 */
export interface MonitoringConfig {
  environment: 'development' | 'staging' | 'production'
  enablePerformanceMonitoring: boolean
  enableBusinessMonitoring: boolean
  enableErrorTracking: boolean
  enableAlerts: boolean
  sentry: {
    dsn?: string
    tracesSampleRate?: number
    profilesSampleRate?: number
    environment?: string
    release?: string
  }
  performance: {
    enableWebVitals: boolean
    enableResourceTiming: boolean
    enableNavigationTiming: boolean
    enableMemoryMonitoring: boolean
  }
  business: {
    enableUserJourneys: boolean
    enableContentTracking: boolean
    enableSearchTracking: boolean
    enableApiErrorTracking: boolean
  }
  alerts: {
    enableEmailAlerts: boolean
    enableSlackAlerts: boolean
    enableSmsAlerts: boolean
    quietHours?: {
      enabled: boolean
      start: string
      end: string
      timezone: string
    }
  }
}

/**
 * 默认监控配置
 */
const defaultConfig: MonitoringConfig = {
  environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
  enablePerformanceMonitoring: true,
  enableBusinessMonitoring: true,
  enableErrorTracking: true,
  enableAlerts: process.env.NODE_ENV === 'production',
  sentry: {
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    environment: process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version
  },
  performance: {
    enableWebVitals: true,
    enableResourceTiming: true,
    enableNavigationTiming: true,
    enableMemoryMonitoring: process.env.NODE_ENV === 'production'
  },
  business: {
    enableUserJourneys: true,
    enableContentTracking: true,
    enableSearchTracking: true,
    enableApiErrorTracking: true
  },
  alerts: {
    enableEmailAlerts: process.env.NODE_ENV === 'production',
    enableSlackAlerts: process.env.NODE_ENV === 'production',
    enableSmsAlerts: false,
    quietHours: {
      enabled: true,
      start: '23:00',
      end: '07:00',
      timezone: 'Asia/Shanghai'
    }
  }
}

/**
 * 监控系统管理类
 */
class MonitoringSystem {
  private config: MonitoringConfig
  private initialized = false

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = { ...defaultConfig, ...config }
  }

  /**
   * 初始化监控系统
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('MonitoringSystem', 'Already initialized')
      return
    }

    try {
      logger.info('MonitoringSystem', 'Initializing monitoring system', {
        environment: this.config.environment,
        enablePerformanceMonitoring: this.config.enablePerformanceMonitoring,
        enableBusinessMonitoring: this.config.enableBusinessMonitoring,
        enableErrorTracking: this.config.enableErrorTracking
      })

      // 验证告警配置
      if (this.config.enableAlerts) {
        const alertConfig = getAlertConfig()
        const validation = validateAlertConfig(alertConfig)
        if (!validation.valid) {
          logger.error('MonitoringSystem', 'Invalid alert configuration', undefined, {
            errors: validation.errors
          })
        } else {
          logger.info('MonitoringSystem', 'Alert configuration validated successfully')
        }
      }

      // 初始化性能监控
      if (this.config.enablePerformanceMonitoring) {
        logger.info('MonitoringSystem', 'Performance monitoring enabled')
      }

      // 初始化业务监控
      if (this.config.enableBusinessMonitoring) {
        logger.info('MonitoringSystem', 'Business monitoring enabled')
      }

      // 设置定期清理
      this.setupCleanup()

      this.initialized = true
      logger.info('MonitoringSystem', 'Monitoring system initialized successfully')

      // 记录初始化事件
      if (this.config.enableBusinessMonitoring) {
        await businessMonitor.recordBusinessEvent({
          action: 'monitoring_system_initialized',
          category: 'system_event',
          severity: 'low',
          metadata: {
            environment: this.config.environment,
            timestamp: new Date().toISOString()
          }
        })
      }

    } catch (error) {
      logger.error('MonitoringSystem', 'Failed to initialize monitoring system', error as Error)
      throw error
    }
  }

  /**
   * 设置定期清理任务
   */
  private setupCleanup(): void {
    // 每小时清理一次过期数据
    setInterval(() => {
      try {
        if (this.config.enableBusinessMonitoring) {
          businessMonitor.cleanup()
        }
        
        if (this.config.enablePerformanceMonitoring) {
          performanceMonitor.cleanup()
        }
        
        logger.info('MonitoringSystem', 'Cleanup completed')
      } catch (error) {
        logger.error('MonitoringSystem', 'Cleanup failed', error as Error)
      }
    }, 60 * 60 * 1000) // 1小时
  }

  /**
   * 获取系统健康状态
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    components: Record<string, {
      status: 'up' | 'down' | 'degraded'
      lastCheck: string
      details?: string
    }>
    metrics: {
      performance: Record<string, number>
      business: Record<string, number>
      errors: {
        count: number
        rate: number
      }
    }
  } {
    const now = new Date().toISOString()
    
    const components = {
      sentry: {
        status: this.config.enableErrorTracking ? 'up' as const : 'down' as const,
        lastCheck: now,
        details: this.config.enableErrorTracking ? 'Error tracking enabled' : 'Error tracking disabled'
      },
      performance: {
        status: this.config.enablePerformanceMonitoring ? 'up' as const : 'down' as const,
        lastCheck: now,
        details: this.config.enablePerformanceMonitoring ? 'Performance monitoring enabled' : 'Performance monitoring disabled'
      },
      business: {
        status: this.config.enableBusinessMonitoring ? 'up' as const : 'down' as const,
        lastCheck: now,
        details: this.config.enableBusinessMonitoring ? 'Business monitoring enabled' : 'Business monitoring disabled'
      },
      alerts: {
        status: this.config.enableAlerts ? 'up' as const : 'down' as const,
        lastCheck: now,
        details: this.config.enableAlerts ? 'Alerts enabled' : 'Alerts disabled'
      }
    }

    const performanceMetrics = this.config.enablePerformanceMonitoring 
      ? performanceMonitor.getMetrics() 
      : {}
    
    const businessMetrics = this.config.enableBusinessMonitoring 
      ? businessMonitor.getMetrics() 
      : {}

    // 简化指标格式
    const metrics = {
      performance: Object.fromEntries(
        Object.entries(performanceMetrics).map(([key, metric]) => [key, metric.value])
      ),
      business: Object.fromEntries(
        Object.entries(businessMetrics).map(([key, metric]) => [key, metric.value])
      ),
      errors: {
        count: 0, // 这里可以从实际错误统计中获取
        rate: 0   // 这里可以从实际错误率中获取
      }
    }

    // 确定整体状态
    const componentStatuses = Object.values(components).map(c => c.status)
    const hasDown = componentStatuses.includes('down')
    
    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (hasDown) {
      status = 'unhealthy'
    } else {
      status = 'healthy'
    }

    return {
      status,
      components,
      metrics
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig }
    logger.info('MonitoringSystem', 'Configuration updated', {
      newConfig
    })
  }

  /**
   * 获取当前配置
   */
  getConfig(): MonitoringConfig {
    return { ...this.config }
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * 关闭监控系统
   */
  shutdown(): void {
    if (!this.initialized) {
      return
    }

    logger.info('MonitoringSystem', 'Shutting down monitoring system')
    
    // 清理资源
    if (this.config.enablePerformanceMonitoring) {
      performanceMonitor.cleanup()
    }
    
    if (this.config.enableBusinessMonitoring) {
      businessMonitor.cleanup()
    }

    this.initialized = false
    logger.info('MonitoringSystem', 'Monitoring system shut down')
  }
}

// 创建全局监控系统实例
export const monitoring = new MonitoringSystem()

/**
 * 便捷的初始化函数
 */
export async function initializeMonitoring(config?: Partial<MonitoringConfig>): Promise<void> {
  if (config) {
    monitoring.updateConfig(config)
  }
  await monitoring.initialize()
}

/**
 * 获取监控系统健康状态
 */
export function getMonitoringHealth() {
  return monitoring.getHealthStatus()
}

/**
 * 便捷的错误捕获函数
 */
export function captureMonitoringError(
  error: Error,
  context?: {
    module?: string
    userId?: string
    url?: string
    additionalData?: Record<string, unknown>
  }
) {
  return sentryIntegration.captureError(error, {
    module: context?.module || 'Unknown',
    userId: context?.userId,
    url: context?.url,
    additionalData: context?.additionalData
  })
}

// 监控系统配置类型已在上方定义
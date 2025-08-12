// lib/alert-config.ts
/**
 * Sentry 告警策略配置
 * 定义不同类型错误的告警规则和通知策略
 */

export interface AlertRule {
  name: string
  description: string
  conditions: {
    errorRate?: number // 错误率阈值 (0-1)
    errorCount?: number // 错误数量阈值
    timeWindow?: number // 时间窗口 (分钟)
    environment?: string[] // 环境限制
    tags?: Record<string, string> // 标签过滤
    level?: ('error' | 'warning' | 'info')[] // 错误级别
  }
  actions: {
    email?: string[] // 邮件通知
    slack?: {
      webhook: string
      channel: string
    }
    webhook?: string // 自定义 webhook
    sms?: string[] // 短信通知 (生产环境)
  }
  enabled: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface AlertConfig {
  rules: AlertRule[]
  globalSettings: {
    defaultTimeWindow: number // 默认时间窗口 (分钟)
    maxAlertsPerHour: number // 每小时最大告警数
    quietHours?: {
      start: string // HH:MM 格式
      end: string // HH:MM 格式
      timezone: string
    }
    escalation: {
      enabled: boolean
      levels: Array<{
        threshold: number // 分钟
        actions: AlertRule['actions']
      }>
    }
  }
}

/**
 * 生产环境告警配置
 */
export const productionAlertConfig: AlertConfig = {
  rules: [
    // 关键错误 - 立即告警
    {
      name: 'Critical System Errors',
      description: '系统关键错误，需要立即处理',
      conditions: {
        errorCount: 1,
        timeWindow: 1,
        environment: ['production'],
        level: ['error'],
        tags: {
          severity: 'critical'
        }
      },
      actions: {
        email: [
          process.env.ALERT_EMAIL_PRIMARY || 'admin@example.com',
          process.env.ALERT_EMAIL_SECONDARY || 'dev@example.com'
        ],
        slack: {
          webhook: process.env.SLACK_WEBHOOK_CRITICAL || '',
          channel: '#alerts-critical'
        },
        sms: [
          process.env.ALERT_SMS_PRIMARY || ''
        ]
      },
      enabled: true,
      priority: 'critical'
    },
    
    // 高频错误
    {
      name: 'High Error Rate',
      description: '错误率过高，可能影响用户体验',
      conditions: {
        errorRate: 0.05, // 5%
        timeWindow: 5,
        environment: ['production'],
        level: ['error', 'warning']
      },
      actions: {
        email: [
          process.env.ALERT_EMAIL_PRIMARY || 'admin@example.com'
        ],
        slack: {
          webhook: process.env.SLACK_WEBHOOK_HIGH || '',
          channel: '#alerts-high'
        }
      },
      enabled: true,
      priority: 'high'
    },
    
    // 性能问题
    {
      name: 'Performance Issues',
      description: '性能指标超过阈值',
      conditions: {
        errorCount: 10,
        timeWindow: 10,
        environment: ['production'],
        tags: {
          category: 'performance'
        }
      },
      actions: {
        email: [
          process.env.ALERT_EMAIL_PRIMARY || 'admin@example.com'
        ],
        slack: {
          webhook: process.env.SLACK_WEBHOOK_MEDIUM || '',
          channel: '#alerts-performance'
        }
      },
      enabled: true,
      priority: 'medium'
    },
    
    // API 错误
    {
      name: 'API Errors',
      description: 'API 接口错误率过高',
      conditions: {
        errorCount: 20,
        timeWindow: 15,
        environment: ['production'],
        tags: {
          module: 'api'
        }
      },
      actions: {
        email: [
          process.env.ALERT_EMAIL_PRIMARY || 'admin@example.com'
        ],
        slack: {
          webhook: process.env.SLACK_WEBHOOK_MEDIUM || '',
          channel: '#alerts-api'
        }
      },
      enabled: true,
      priority: 'medium'
    },
    
    // 数据库问题
    {
      name: 'Database Issues',
      description: '数据库相关错误',
      conditions: {
        errorCount: 5,
        timeWindow: 5,
        environment: ['production'],
        tags: {
          module: 'database'
        }
      },
      actions: {
        email: [
          process.env.ALERT_EMAIL_PRIMARY || 'admin@example.com'
        ],
        slack: {
          webhook: process.env.SLACK_WEBHOOK_HIGH || '',
          channel: '#alerts-database'
        }
      },
      enabled: true,
      priority: 'high'
    },
    
    // 认证问题
    {
      name: 'Authentication Issues',
      description: '用户认证相关错误',
      conditions: {
        errorCount: 15,
        timeWindow: 10,
        environment: ['production'],
        tags: {
          module: 'auth'
        }
      },
      actions: {
        email: [
          process.env.ALERT_EMAIL_PRIMARY || 'admin@example.com'
        ],
        slack: {
          webhook: process.env.SLACK_WEBHOOK_MEDIUM || '',
          channel: '#alerts-auth'
        }
      },
      enabled: true,
      priority: 'medium'
    },
    
    // 业务指标异常
    {
      name: 'Business Metrics Anomaly',
      description: '业务指标异常，需要关注',
      conditions: {
        errorCount: 5,
        timeWindow: 30,
        environment: ['production'],
        tags: {
          category: 'business_metric'
        }
      },
      actions: {
        email: [
          process.env.ALERT_EMAIL_PRIMARY || 'admin@example.com'
        ],
        slack: {
          webhook: process.env.SLACK_WEBHOOK_LOW || '',
          channel: '#alerts-business'
        }
      },
      enabled: true,
      priority: 'low'
    }
  ],
  
  globalSettings: {
    defaultTimeWindow: 5,
    maxAlertsPerHour: 20,
    quietHours: {
      start: '23:00',
      end: '07:00',
      timezone: 'Asia/Shanghai'
    },
    escalation: {
      enabled: true,
      levels: [
        {
          threshold: 15, // 15分钟后升级
          actions: {
            email: [
              process.env.ALERT_EMAIL_ESCALATION || 'manager@example.com'
            ],
            sms: [
              process.env.ALERT_SMS_ESCALATION || ''
            ]
          }
        },
        {
          threshold: 60, // 1小时后再次升级
          actions: {
            email: [
              process.env.ALERT_EMAIL_EXECUTIVE || 'cto@example.com'
            ],
            sms: [
              process.env.ALERT_SMS_EXECUTIVE || ''
            ]
          }
        }
      ]
    }
  }
}

/**
 * 开发环境告警配置 (简化版)
 */
export const developmentAlertConfig: AlertConfig = {
  rules: [
    {
      name: 'Development Critical Errors',
      description: '开发环境关键错误',
      conditions: {
        errorCount: 1,
        timeWindow: 1,
        environment: ['development'],
        level: ['error'],
        tags: {
          severity: 'critical'
        }
      },
      actions: {
        email: [
          process.env.DEV_ALERT_EMAIL || 'dev@example.com'
        ]
      },
      enabled: true,
      priority: 'high'
    }
  ],
  
  globalSettings: {
    defaultTimeWindow: 10,
    maxAlertsPerHour: 5,
    escalation: {
      enabled: false,
      levels: []
    }
  }
}

/**
 * 获取当前环境的告警配置
 */
export function getAlertConfig(): AlertConfig {
  const isProduction = process.env.NODE_ENV === 'production'
  return isProduction ? productionAlertConfig : developmentAlertConfig
}

/**
 * 验证告警配置
 */
export function validateAlertConfig(config: AlertConfig): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // 验证规则
  config.rules.forEach((rule, index) => {
    if (!rule.name) {
      errors.push(`Rule ${index}: name is required`)
    }
    
    if (!rule.conditions) {
      errors.push(`Rule ${index}: conditions are required`)
    }
    
    if (!rule.actions || Object.keys(rule.actions).length === 0) {
      errors.push(`Rule ${index}: at least one action is required`)
    }
    
    // 验证邮件格式
    if (rule.actions.email) {
      rule.actions.email.forEach(email => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push(`Rule ${index}: invalid email format: ${email}`)
        }
      })
    }
    
    // 验证时间窗口
    if (rule.conditions.timeWindow && rule.conditions.timeWindow <= 0) {
      errors.push(`Rule ${index}: timeWindow must be positive`)
    }
    
    // 验证错误率
    if (rule.conditions.errorRate && (rule.conditions.errorRate < 0 || rule.conditions.errorRate > 1)) {
      errors.push(`Rule ${index}: errorRate must be between 0 and 1`)
    }
  })
  
  // 验证全局设置
  if (config.globalSettings.defaultTimeWindow <= 0) {
    errors.push('Global settings: defaultTimeWindow must be positive')
  }
  
  if (config.globalSettings.maxAlertsPerHour <= 0) {
    errors.push('Global settings: maxAlertsPerHour must be positive')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 格式化告警消息
 */
export function formatAlertMessage(
  rule: AlertRule,
  errorData: {
    count: number
    rate?: number
    timeWindow: number
    environment: string
    errors: Array<{
      message: string
      timestamp: string
      url?: string
      userId?: string
    }>
  }
): string {
  const { count, rate, timeWindow, environment, errors } = errorData
  
  let message = `🚨 Alert: ${rule.name}\n\n`
  message += `Description: ${rule.description}\n`
  message += `Environment: ${environment}\n`
  message += `Time Window: ${timeWindow} minutes\n`
  message += `Error Count: ${count}\n`
  
  if (rate !== undefined) {
    message += `Error Rate: ${(rate * 100).toFixed(2)}%\n`
  }
  
  message += `Priority: ${rule.priority.toUpperCase()}\n\n`
  
  if (errors.length > 0) {
    message += `Recent Errors:\n`
    errors.slice(0, 5).forEach((error, index) => {
      message += `${index + 1}. ${error.message}\n`
      message += `   Time: ${error.timestamp}\n`
      if (error.url) {
        message += `   URL: ${error.url}\n`
      }
      if (error.userId) {
        message += `   User: ${error.userId}\n`
      }
      message += `\n`
    })
  }
  
  return message
}

// Types are already exported above
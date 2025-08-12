// lib/dashboard-config.ts
/**
 * 监控 Dashboard 配置
 * 定义 Sentry Dashboard 和自定义监控面板的配置
 */

export interface DashboardWidget {
  id: string
  title: string
  type: 'chart' | 'table' | 'number' | 'gauge' | 'heatmap'
  query: string
  visualization: {
    chartType?: 'line' | 'bar' | 'pie' | 'area'
    timeRange: string // e.g., '24h', '7d', '30d'
    refreshInterval: number // seconds
    displayOptions?: {
      showLegend?: boolean
      showGrid?: boolean
      colors?: string[]
      threshold?: {
        warning: number
        critical: number
      }
    }
  }
  position: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface Dashboard {
  id: string
  name: string
  description: string
  category: 'overview' | 'performance' | 'errors' | 'business' | 'security'
  widgets: DashboardWidget[]
  filters: {
    environment: string[]
    timeRange: string
    tags?: Record<string, string>
  }
  permissions: {
    viewers: string[] // user roles or emails
    editors: string[] // user roles or emails
  }
  isPublic: boolean
}

/**
 * 系统概览 Dashboard
 */
export const overviewDashboard: Dashboard = {
  id: 'system-overview',
  name: '系统概览',
  description: '系统整体健康状况和关键指标',
  category: 'overview',
  widgets: [
    {
      id: 'error-rate',
      title: '错误率趋势',
      type: 'chart',
      query: 'event.type:error',
      visualization: {
        chartType: 'line',
        timeRange: '24h',
        refreshInterval: 300,
        displayOptions: {
          showLegend: true,
          showGrid: true,
          colors: ['#ff4444', '#ffaa00', '#44ff44'],
          threshold: {
            warning: 0.05,
            critical: 0.1
          }
        }
      },
      position: { x: 0, y: 0, width: 6, height: 4 }
    },
    {
      id: 'total-errors',
      title: '总错误数',
      type: 'number',
      query: 'event.type:error',
      visualization: {
        timeRange: '24h',
        refreshInterval: 60,
        displayOptions: {
          threshold: {
            warning: 100,
            critical: 500
          }
        }
      },
      position: { x: 6, y: 0, width: 3, height: 2 }
    },
    {
      id: 'active-users',
      title: '活跃用户数',
      type: 'number',
      query: 'event.type:transaction',
      visualization: {
        timeRange: '24h',
        refreshInterval: 300
      },
      position: { x: 9, y: 0, width: 3, height: 2 }
    },
    {
      id: 'response-time',
      title: '平均响应时间',
      type: 'gauge',
      query: 'transaction.duration:*',
      visualization: {
        timeRange: '1h',
        refreshInterval: 60,
        displayOptions: {
          threshold: {
            warning: 1000,
            critical: 3000
          }
        }
      },
      position: { x: 6, y: 2, width: 6, height: 2 }
    },
    {
      id: 'error-distribution',
      title: '错误分布',
      type: 'chart',
      query: 'event.type:error',
      visualization: {
        chartType: 'pie',
        timeRange: '24h',
        refreshInterval: 600,
        displayOptions: {
          showLegend: true
        }
      },
      position: { x: 0, y: 4, width: 6, height: 4 }
    },
    {
      id: 'top-errors',
      title: '热门错误',
      type: 'table',
      query: 'event.type:error',
      visualization: {
        timeRange: '24h',
        refreshInterval: 300
      },
      position: { x: 6, y: 4, width: 6, height: 4 }
    }
  ],
  filters: {
    environment: ['production'],
    timeRange: '24h'
  },
  permissions: {
    viewers: ['admin', 'developer', 'ops'],
    editors: ['admin', 'ops']
  },
  isPublic: false
}

/**
 * 性能监控 Dashboard
 */
export const performanceDashboard: Dashboard = {
  id: 'performance-monitoring',
  name: '性能监控',
  description: '应用性能指标和优化建议',
  category: 'performance',
  widgets: [
    {
      id: 'web-vitals',
      title: 'Web Vitals',
      type: 'chart',
      query: 'measurements.lcp:* OR measurements.fid:* OR measurements.cls:*',
      visualization: {
        chartType: 'line',
        timeRange: '24h',
        refreshInterval: 300,
        displayOptions: {
          showLegend: true,
          colors: ['#00ff00', '#ffaa00', '#ff0000']
        }
      },
      position: { x: 0, y: 0, width: 8, height: 4 }
    },
    {
      id: 'page-load-time',
      title: '页面加载时间',
      type: 'gauge',
      query: 'transaction.op:pageload',
      visualization: {
        timeRange: '1h',
        refreshInterval: 60,
        displayOptions: {
          threshold: {
            warning: 3000,
            critical: 5000
          }
        }
      },
      position: { x: 8, y: 0, width: 4, height: 2 }
    },
    {
      id: 'api-response-time',
      title: 'API 响应时间',
      type: 'chart',
      query: 'transaction.op:http.server',
      visualization: {
        chartType: 'area',
        timeRange: '24h',
        refreshInterval: 300,
        displayOptions: {
          showGrid: true,
          threshold: {
            warning: 1000,
            critical: 3000
          }
        }
      },
      position: { x: 0, y: 4, width: 6, height: 4 }
    },
    {
      id: 'slow-transactions',
      title: '慢事务',
      type: 'table',
      query: 'transaction.duration:>3s',
      visualization: {
        timeRange: '24h',
        refreshInterval: 300
      },
      position: { x: 6, y: 4, width: 6, height: 4 }
    },
    {
      id: 'throughput',
      title: '吞吐量',
      type: 'number',
      query: 'event.type:transaction',
      visualization: {
        timeRange: '1h',
        refreshInterval: 60
      },
      position: { x: 8, y: 2, width: 4, height: 2 }
    }
  ],
  filters: {
    environment: ['production'],
    timeRange: '24h'
  },
  permissions: {
    viewers: ['admin', 'developer', 'ops'],
    editors: ['admin', 'ops']
  },
  isPublic: false
}

/**
 * 业务监控 Dashboard
 */
export const businessDashboard: Dashboard = {
  id: 'business-monitoring',
  name: '业务监控',
  description: '业务指标和用户行为分析',
  category: 'business',
  widgets: [
    {
      id: 'user-actions',
      title: '用户行为统计',
      type: 'chart',
      query: 'tags.category:user_action',
      visualization: {
        chartType: 'bar',
        timeRange: '24h',
        refreshInterval: 300,
        displayOptions: {
          showLegend: true
        }
      },
      position: { x: 0, y: 0, width: 6, height: 4 }
    },
    {
      id: 'content-interactions',
      title: '内容交互',
      type: 'chart',
      query: 'tags.action:content_like OR tags.action:content_comment',
      visualization: {
        chartType: 'line',
        timeRange: '7d',
        refreshInterval: 600,
        displayOptions: {
          showLegend: true,
          colors: ['#ff6b6b', '#4ecdc4']
        }
      },
      position: { x: 6, y: 0, width: 6, height: 4 }
    },
    {
      id: 'search-metrics',
      title: '搜索指标',
      type: 'table',
      query: 'tags.action:search_performed',
      visualization: {
        timeRange: '24h',
        refreshInterval: 300
      },
      position: { x: 0, y: 4, width: 6, height: 4 }
    },
    {
      id: 'user-journeys',
      title: '用户旅程',
      type: 'chart',
      query: 'tags.action:journey_completed',
      visualization: {
        chartType: 'area',
        timeRange: '7d',
        refreshInterval: 600,
        displayOptions: {
          showGrid: true
        }
      },
      position: { x: 6, y: 4, width: 6, height: 4 }
    }
  ],
  filters: {
    environment: ['production'],
    timeRange: '24h'
  },
  permissions: {
    viewers: ['admin', 'developer', 'product', 'analytics'],
    editors: ['admin', 'product']
  },
  isPublic: false
}

/**
 * 错误监控 Dashboard
 */
export const errorDashboard: Dashboard = {
  id: 'error-monitoring',
  name: '错误监控',
  description: '错误详情和趋势分析',
  category: 'errors',
  widgets: [
    {
      id: 'error-trends',
      title: '错误趋势',
      type: 'chart',
      query: 'event.type:error',
      visualization: {
        chartType: 'line',
        timeRange: '7d',
        refreshInterval: 300,
        displayOptions: {
          showLegend: true,
          showGrid: true,
          colors: ['#ff4444']
        }
      },
      position: { x: 0, y: 0, width: 8, height: 4 }
    },
    {
      id: 'error-count-today',
      title: '今日错误数',
      type: 'number',
      query: 'event.type:error',
      visualization: {
        timeRange: '24h',
        refreshInterval: 60,
        displayOptions: {
          threshold: {
            warning: 50,
            critical: 200
          }
        }
      },
      position: { x: 8, y: 0, width: 4, height: 2 }
    },
    {
      id: 'affected-users',
      title: '受影响用户',
      type: 'number',
      query: 'event.type:error',
      visualization: {
        timeRange: '24h',
        refreshInterval: 300
      },
      position: { x: 8, y: 2, width: 4, height: 2 }
    },
    {
      id: 'error-by-module',
      title: '模块错误分布',
      type: 'chart',
      query: 'event.type:error',
      visualization: {
        chartType: 'pie',
        timeRange: '24h',
        refreshInterval: 600,
        displayOptions: {
          showLegend: true
        }
      },
      position: { x: 0, y: 4, width: 6, height: 4 }
    },
    {
      id: 'recent-errors',
      title: '最近错误',
      type: 'table',
      query: 'event.type:error',
      visualization: {
        timeRange: '1h',
        refreshInterval: 60
      },
      position: { x: 6, y: 4, width: 6, height: 4 }
    }
  ],
  filters: {
    environment: ['production'],
    timeRange: '24h'
  },
  permissions: {
    viewers: ['admin', 'developer', 'ops'],
    editors: ['admin', 'ops']
  },
  isPublic: false
}

/**
 * 所有 Dashboard 配置
 */
export const dashboards: Dashboard[] = [
  overviewDashboard,
  performanceDashboard,
  businessDashboard,
  errorDashboard
]

/**
 * 根据类别获取 Dashboard
 */
export function getDashboardsByCategory(category: Dashboard['category']): Dashboard[] {
  return dashboards.filter(dashboard => dashboard.category === category)
}

/**
 * 根据用户权限过滤 Dashboard
 */
export function filterDashboardsByPermission(
  userRole: string,
  userEmail?: string
): Dashboard[] {
  return dashboards.filter(dashboard => {
    if (dashboard.isPublic) return true
    
    const hasViewPermission = 
      dashboard.permissions.viewers.includes(userRole) ||
      Boolean(userEmail && dashboard.permissions.viewers.includes(userEmail))
    
    return hasViewPermission
  })
}

/**
 * 检查用户是否有编辑权限
 */
export function canEditDashboard(
  dashboardId: string,
  userRole: string,
  userEmail?: string
): boolean {
  const dashboard = dashboards.find(d => d.id === dashboardId)
  if (!dashboard) return false
  
  const hasEditPermission = 
    dashboard.permissions.editors.includes(userRole) ||
    Boolean(userEmail && dashboard.permissions.editors.includes(userEmail))
  
  return hasEditPermission
}

/**
 * 生成 Sentry Dashboard URL
 */
export function generateSentryDashboardUrl(
  dashboardId: string,
  orgSlug: string = process.env.SENTRY_ORG || 'your-org',
  projectSlug: string = process.env.SENTRY_PROJECT || 'your-project'
): string {
  const baseUrl = 'https://sentry.io/organizations'
  return `${baseUrl}/${orgSlug}/dashboards/${dashboardId}/?project=${projectSlug}`
}

/**
 * Dashboard 配置验证
 */
export function validateDashboard(dashboard: Dashboard): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (!dashboard.id) {
    errors.push('Dashboard ID is required')
  }
  
  if (!dashboard.name) {
    errors.push('Dashboard name is required')
  }
  
  if (!dashboard.widgets || dashboard.widgets.length === 0) {
    errors.push('Dashboard must have at least one widget')
  }
  
  dashboard.widgets.forEach((widget, index) => {
    if (!widget.id) {
      errors.push(`Widget ${index}: ID is required`)
    }
    
    if (!widget.title) {
      errors.push(`Widget ${index}: title is required`)
    }
    
    if (!widget.query) {
      errors.push(`Widget ${index}: query is required`)
    }
    
    if (!widget.visualization.timeRange) {
      errors.push(`Widget ${index}: timeRange is required`)
    }
    
    if (widget.visualization.refreshInterval <= 0) {
      errors.push(`Widget ${index}: refreshInterval must be positive`)
    }
  })
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Types are already exported above
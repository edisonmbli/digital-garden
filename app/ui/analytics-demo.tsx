'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { analytics } from '@/lib/analytics-logger'

export function AnalyticsDemo() {
  const [sessionId, setSessionId] = useState<string>('')
  const [queueSize, setQueueSize] = useState<number>(0)

  useEffect(() => {
    // 获取会话ID
    setSessionId(analytics.getSessionId())
    
    // 追踪演示页面访问
    analytics.trackPageView('/analytics-demo', {
      pageType: 'demo',
      feature: 'analytics',
      section: 'testing'
    })

    // 定期更新队列大小
    const interval = setInterval(() => {
      setQueueSize(analytics.getQueueSize())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleBasicEvent = () => {
    analytics.track('demo_basic_event', {
      buttonType: 'primary',
      timestamp: Date.now(),
      userAction: 'click'
    })
  }

  const handleUserInteraction = () => {
    analytics.trackInteraction('demo_button', 'click', {
      buttonId: 'interaction-demo',
      location: 'analytics-demo-page',
      interactionType: 'user_initiated'
    })
  }

  const handleBusinessEvent = () => {
    analytics.trackBusinessEvent('like', {
      postId: 'demo-post-123',
      action: 'like',
      userId: 'demo-user',
      source: 'analytics_demo'
    })
  }

  const handlePerformanceEvent = () => {
    const startTime = performance.now()
    
    // 模拟一些操作
    setTimeout(() => {
      const endTime = performance.now()
      analytics.trackPerformance('demo_operation', endTime - startTime, {
        operationType: 'simulated_task',
        complexity: 'medium'
      })
    }, Math.random() * 1000 + 500) // 随机延迟500-1500ms
  }

  const handleErrorEvent = () => {
    try {
      // 故意抛出一个错误
      throw new Error('这是一个演示错误')
    } catch (error) {
      analytics.trackError(error as Error, {
        component: 'AnalyticsDemo',
        action: 'error_simulation',
        severity: 'low'
      })
    }
  }

  const handleIdentify = () => {
    analytics.identify('demo-user-456', {
      plan: 'premium',
      signupDate: '2024-01-01',
      preferences: {
        theme: 'dark',
        language: 'zh'
      }
    })
  }

  const handleFlush = async () => {
    await analytics.flush()
    setQueueSize(0)
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>📊 Analytics 系统演示</CardTitle>
          <CardDescription>
            测试和演示自建Analytics系统的各种功能。同时集成了 Vercel Analytics 用于 UV/PV 统计和 Speed Insights 性能监控。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>会话ID:</strong> 
              <Badge variant="outline" className="ml-2 font-mono text-xs">
                {sessionId.slice(0, 16)}...
              </Badge>
            </div>
            <div>
              <strong>队列中事件数:</strong> 
              <Badge variant={queueSize > 0 ? "default" : "secondary"} className="ml-2">
                {queueSize}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">基础事件追踪</CardTitle>
            <CardDescription>追踪自定义事件</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBasicEvent} className="w-full">
              发送基础事件
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">用户交互追踪</CardTitle>
            <CardDescription>追踪用户界面交互</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleUserInteraction} variant="outline" className="w-full">
              追踪交互事件
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">业务事件追踪</CardTitle>
            <CardDescription>追踪业务相关事件</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBusinessEvent} variant="secondary" className="w-full">
              模拟点赞事件
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">性能监控</CardTitle>
            <CardDescription>追踪性能指标</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handlePerformanceEvent} variant="outline" className="w-full">
              测试性能追踪
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">错误追踪</CardTitle>
            <CardDescription>追踪和记录错误</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleErrorEvent} variant="destructive" className="w-full">
              模拟错误事件
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">用户识别</CardTitle>
            <CardDescription>设置用户属性</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleIdentify} variant="outline" className="w-full">
              识别用户
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">队列管理</CardTitle>
          <CardDescription>
            事件会自动批量发送，或者你可以手动刷新队列
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleFlush} variant="outline" className="w-full">
            立即发送队列中的事件 ({queueSize})
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• 事件会自动批量发送到服务器（每10个事件或5秒间隔）</p>
          <p>• 所有事件都会保存到 <code>logs/analytics/</code> 目录下</p>
          <p>• 在开发环境下，控制台会显示详细的事件信息</p>
          <p>• 页面卸载时会自动发送剩余的事件</p>
          <p>• 支持防重复机制，3秒内相同事件只会记录一次</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🚀 Vercel Analytics 集成</CardTitle>
          <CardDescription>
            已集成 Vercel Analytics 和 Speed Insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Vercel Analytics:</strong> 自动追踪页面访问量 (PV) 和独立访客数 (UV)</p>
          <p>• <strong>Speed Insights:</strong> 自动监控页面性能指标 (Core Web Vitals)</p>
          <p>• <strong>无冲突设计:</strong> 与自建分析系统完美共存，各司其职</p>
          <p>• <strong>生产环境:</strong> 部署到 Vercel 后可在仪表板查看详细数据</p>
          <p>• <strong>开发环境:</strong> 本地开发时数据不会上报到 Vercel</p>
        </CardContent>
      </Card>
    </div>
  )
}
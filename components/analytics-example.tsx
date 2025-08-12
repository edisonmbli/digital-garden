'use client'

import { useEffect, useState } from 'react'
import { AnalyticsLogger } from '@/lib/analytics-logger'

// 全局Analytics实例
const analytics = new AnalyticsLogger()

/**
 * Analytics使用示例组件
 * 展示如何在React组件中集成自建Analytics系统
 */
export function AnalyticsExample() {
  const [clickCount, setClickCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // 页面加载时追踪页面访问
    analytics.trackPageView('/analytics-example', {
      section: 'demo',
      feature: 'analytics-integration'
    })

    // 追踪性能指标
    analytics.trackPerformance('page_load', performance.now(), {
      // 在实际应用中，这些指标会通过Performance Observer获取
      fcp: 1200,
      lcp: 2500
    })

    return () => {
      // 组件卸载时确保数据发送
      analytics.flush()
    }
  }, [])

  const handleButtonClick = () => {
    setClickCount(prev => prev + 1)
    
    // 追踪用户交互
    analytics.trackInteraction('button_click', 'click', {
      buttonType: 'demo-button',
      clickCount: clickCount + 1,
      timestamp: Date.now()
    })
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    
    // 追踪业务事件
    analytics.track('search_performed', {
      query,
      queryLength: query.length,
      hasResults: query.length > 0 // 简化示例
    })
  }

  const handleError = () => {
    try {
      // 模拟错误
      throw new Error('这是一个演示错误')
    } catch (error) {
      // 追踪错误事件
      analytics.trackError(error as Error, {
        component: 'AnalyticsExample',
        action: 'handleError',
        userTriggered: true
      })
    }
  }

  const handleCustomEvent = () => {
    // 追踪自定义事件
    analytics.track('feature_demo', {
      featureName: 'analytics-tracking',
      userEngagement: 'high',
      demoStep: 'custom-event'
    })
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Analytics 集成示例</h2>
        <p className="text-gray-600 mb-6">
          这个组件展示了如何在React应用中集成自建Analytics系统。
          所有的用户交互都会被追踪并发送到服务端。
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 用户交互追踪 */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">用户交互追踪</h3>
            <button
              onClick={handleButtonClick}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
            >
              点击我 ({clickCount})
            </button>
            <p className="text-sm text-gray-500 mt-2">
              每次点击都会触发 user_interaction 事件
            </p>
          </div>

          {/* 业务事件追踪 */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">业务事件追踪</h3>
            <input
              type="text"
              placeholder="输入搜索内容..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
            <p className="text-sm text-gray-500 mt-2">
              搜索操作会触发 business_event 事件
            </p>
          </div>

          {/* 错误追踪 */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">错误追踪</h3>
            <button
              onClick={handleError}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
            >
              触发错误
            </button>
            <p className="text-sm text-gray-500 mt-2">
              错误会被自动捕获并发送到Analytics
            </p>
          </div>

          {/* 自定义事件 */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">自定义事件</h3>
            <button
              onClick={handleCustomEvent}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors"
            >
              发送自定义事件
            </button>
            <p className="text-sm text-gray-500 mt-2">
              可以追踪任意自定义业务逻辑
            </p>
          </div>
        </div>

        {/* 数据说明 */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">📊 数据收集说明</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 所有事件都会批量发送到 <code>/api/analytics/batch</code></li>
            <li>• 数据以JSONL格式保存在 <code>logs/analytics/</code> 目录</li>
            <li>• 使用 <code>node scripts/analyze-analytics.js</code> 分析数据</li>
            <li>• 支持用户识别、会话追踪、性能监控等功能</li>
            <li>• 完全自主可控，无第三方依赖</li>
          </ul>
        </div>

        {/* 实时状态 */}
        <div className="mt-4 text-sm text-gray-500">
          <p>会话ID: {analytics.getSessionId().slice(0, 8)}...</p>
          <p>队列中事件数: {analytics.getQueueSize()}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Analytics Hook - 用于在其他组件中方便地使用Analytics
 */
export function useAnalytics() {
  useEffect(() => {
    // 确保Analytics已初始化
    analytics.identify('anonymous-user')
  }, [])

  return {
    trackPageView: analytics.trackPageView.bind(analytics),
    track: analytics.track.bind(analytics),
    trackInteraction: analytics.trackInteraction.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    trackPerformance: analytics.trackPerformance.bind(analytics),
    identify: analytics.identify.bind(analytics),
    flush: analytics.flush.bind(analytics),
    getSessionId: analytics.getSessionId.bind(analytics),
    getQueueSize: analytics.getQueueSize.bind(analytics)
  }
}
'use client'

import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface AnalyticsEvent {
  eventType?: string
  eventName?: string
  timestamp: number | string
  sessionId: string
  data?: Record<string, unknown>
  properties?: Record<string, unknown>
  userId: string
  ip: string
  country: string
  processedAt: string
  serverTimestamp: number
  page?: string
  referrer?: string
  userAgent?: string
}

interface EventSummary {
  eventType: string
  count: number
  lastSeen: string
}

export function AnalyticsDashboard() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  const [summary, setSummary] = useState<EventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const fetchAnalyticsData = async (start?: string, end?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (start) params.append('startDate', start)
      if (end) params.append('endDate', end)

      const url = `/api/analytics/dashboard${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setEvents(data.events || [])
      setSummary(data.summary || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败')
      console.error('获取Analytics数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = () => {
    fetchAnalyticsData(startDate, endDate)
  }

  const handleResetFilter = () => {
    setStartDate('')
    setEndDate('')
    fetchAnalyticsData()
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  const getEventTypeColor = (eventType: string | undefined) => {
    const colors: Record<string, string> = {
      page_view: 'bg-blue-100 text-blue-800',
      interaction: 'bg-green-100 text-green-800',
      business_event: 'bg-purple-100 text-purple-800',
      performance: 'bg-orange-100 text-orange-800',
      error: 'bg-red-100 text-red-800',
      identify: 'bg-indigo-100 text-indigo-800',
      collection_click: 'bg-pink-100 text-pink-800',
    }
    return colors[eventType || 'unknown'] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>加载Analytics数据中...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-red-600">
              <p className="mb-4">❌ {error}</p>
              <Button onClick={() => fetchAnalyticsData()} variant="outline">
                重试
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>📊 Analytics 数据面板</CardTitle>
          <CardDescription>查看和分析收集到的用户行为数据</CardDescription>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Badge variant="outline">总事件数: {events.length}</Badge>
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2 py-1 border rounded text-sm"
                  placeholder="开始日期"
                />
                <span className="text-sm text-muted-foreground">至</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 py-1 border rounded text-sm"
                  placeholder="结束日期"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleDateFilter} variant="outline" size="sm">
                  筛选
                </Button>
                <Button onClick={handleResetFilter} variant="outline" size="sm">
                  重置
                </Button>
                <Button
                  onClick={() => fetchAnalyticsData()}
                  variant="outline"
                  size="sm"
                >
                  刷新数据
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">事件汇总</TabsTrigger>
          <TabsTrigger value="events">事件详情</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.map((item, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getEventTypeColor(item.eventType)}>
                      {item.eventType}
                    </Badge>
                    <span className="text-2xl font-bold">{item.count}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    最后记录: {item.lastSeen}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <div className="space-y-3">
            {events.slice(0, 50).map((event, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={getEventTypeColor(
                          event.eventType || event.eventName
                        )}
                      >
                        {event.eventType || event.eventName || 'unknown'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatTimestamp(event.serverTimestamp)}
                      </span>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {event.sessionId.slice(0, 8)}...
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>用户:</strong> {event.userId}
                    </div>
                    <div>
                      <strong>IP:</strong> {event.ip}
                    </div>
                  </div>

                  {((event.data && Object.keys(event.data).length > 0) ||
                    (event.properties &&
                      Object.keys(event.properties).length > 0)) && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                        事件数据 (
                        {
                          Object.keys(event.data || event.properties || {})
                            .length
                        }{' '}
                        个字段)
                      </summary>
                      <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                        {JSON.stringify(
                          event.data || event.properties || {},
                          null,
                          2
                        )}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            ))}

            {events.length > 50 && (
              <Card>
                <CardContent className="text-center py-4">
                  <p className="text-muted-foreground">
                    显示最近 50 条事件，共 {events.length} 条
                  </p>
                </CardContent>
              </Card>
            )}

            {events.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">暂无Analytics事件数据</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

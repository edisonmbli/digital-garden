'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Activity, Clock, CheckCircle, XCircle } from 'lucide-react'
import { getCacheStatsAction, getCacheLogsAction } from '@/lib/cache-management-actions'
import { subscribeToCacheUpdates } from '@/lib/cache-events'

interface ActionResult<T = unknown> {
  success: boolean
  message?: string
  data?: T
  clearedCount?: number
}

interface CacheStats {
  nextjsCache: {
    size: string
    entries: number
    hitRate: number
  }
  cloudflareCache: {
    status: 'active' | 'inactive'
    purgeHistory: Array<{
      timestamp: string
      type: string
      success: boolean
    }>
  }
  sanityCdn: {
    status: 'active' | 'inactive'
    autoInvalidation: boolean
  }
  recentInvalidations: Array<{
    timestamp: string
    type: string
    target: string
    success: boolean
  }>
}

interface CacheLog {
  id: string
  timestamp: string
  operation: string
  target: string
  success: boolean
  details?: string
}

export function CacheMonitoring() {
  const [stats, setStats] = useState<ActionResult<CacheStats> | null>(null)
  const [logs, setLogs] = useState<CacheLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchCacheStats = async () => {
    setIsLoading(true)
    try {
      const result = await getCacheStatsAction()
      setStats(result)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch cache stats:', error)
      setStats({
        success: false,
        message: '获取缓存统计失败'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCacheLogs = async () => {
    try {
      const result = await getCacheLogsAction(50)
      if (result.success && result.data) {
        setLogs(result.data as CacheLog[])
      } else {
        setLogs([])
      }
    } catch (error) {
      console.error('Failed to fetch cache logs:', error)
      setLogs([])
    }
  }

  useEffect(() => {
    fetchCacheStats()
    fetchCacheLogs()

    // 设置定时刷新
    const interval = setInterval(() => {
      fetchCacheStats()
      fetchCacheLogs()
    }, 30000) // 每30秒刷新一次

    // 订阅缓存更新事件
    const unsubscribe = subscribeToCacheUpdates(() => {
      fetchCacheStats()
      fetchCacheLogs()
    })

    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [])

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return '刚刚'
    if (diffInMinutes < 60) return `${diffInMinutes}分钟前`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}小时前`
    return `${Math.floor(diffInMinutes / 1440)}天前`
  }

  return (
    <div className="space-y-6">
      {/* 缓存状态概览 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              缓存状态监控
            </CardTitle>
            <CardDescription>
              实时监控系统缓存性能和状态
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-sm text-muted-foreground">
                最后更新: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCacheStats}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {stats?.success && stats.data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Next.js 缓存命中率</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.data.nextjsCache.hitRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.data.nextjsCache.entries} 个条目，{stats.data.nextjsCache.size}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Cloudflare 缓存</p>
                <p className="text-2xl font-bold">
                  {stats.data.cloudflareCache.status === 'active' ? '活跃' : '非活跃'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.data.cloudflareCache.purgeHistory.length} 次清理记录
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Sanity CDN</p>
                <p className="text-2xl font-bold">
                  {stats.data.sanityCdn.status === 'active' ? '活跃' : '非活跃'}
                </p>
                <p className="text-xs text-muted-foreground">
                  自动失效: {stats.data.sanityCdn.autoInvalidation ? '开启' : '关闭'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {stats?.message || '加载中...'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 操作日志 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            缓存操作日志
          </CardTitle>
          <CardDescription>
            最近的缓存操作记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {log.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        {log.operation === 'clear_all_cache' && '清理所有缓存'}
                        {log.operation === 'clear_page_cache' && '清理页面缓存'}
                        {log.operation === 'clear_image_cache' && '清理图片缓存'}
                        {log.operation === 'clear_cache_by_type' && '按类型清理缓存'}
                        {log.operation === 'invalidate_specific_path' && '失效特定路径'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        目标: {log.target}
                        {log.details && ` - ${log.details}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={log.success ? 'default' : 'destructive'}>
                      {log.success ? '成功' : '失败'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimeAgo(log.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">暂无操作日志</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
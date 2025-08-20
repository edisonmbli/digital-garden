'use client'

import { useState, useEffect, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RefreshCw, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { getWarmupStats } from '@/lib/admin-warmup-actions'

type WarmupLog = {
  id: string
  timestamp: string
  type: string
  totalUrls: number
  successCount: number
  failureCount: number
  duration: number
  success: boolean
}

type WarmupStats = {
  totalRuns: number
  successRate: number
  averageDuration: number
  lastRun?: string
  recentLogs: WarmupLog[]
}

export function WarmupStats() {
  const [stats, setStats] = useState<WarmupStats | null>(null)
  const [isPending, startTransition] = useTransition()

  const fetchStats = async () => {
    startTransition(async () => {
      try {
        console.log('Fetching warmup stats...')
        const data = await getWarmupStats()
        console.log('Warmup stats response:', data)
        if ('error' in data) {
          console.error('Warmup stats error:', data.error)
          toast.error(data.error)
          return
        }
        setStats(data)
        toast.success('统计数据已刷新')
      } catch (error) {
        console.error('Fetch stats error:', error)
        toast.error(`获取统计数据失败：${error instanceof Error ? error.message : '未知错误'}`)
      }
    })
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}min`
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!stats) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">加载统计数据...</span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={isPending}
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">预热统计</span>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={isPending}
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">总运行次数</div>
          <div className="text-lg font-semibold">{stats.totalRuns}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">成功率</div>
          <div className="text-lg font-semibold text-green-600">
            {(stats.successRate ?? 0).toFixed(1)}%
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">平均耗时</div>
          <div className="text-lg font-semibold">
            {formatDuration(stats.averageDuration ?? 0)}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">最后运行</div>
          <div className="text-sm">
            {stats.lastRun ? formatTimestamp(stats.lastRun) : '无'}
          </div>
        </div>
      </div>

      {stats.recentLogs.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">最近运行记录</div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {stats.recentLogs.map((log) => (
              <Card key={log.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {log.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm font-medium">{log.type}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatTimestamp(log.timestamp)}
                  </div>
                </div>
                
                <div className="mt-2 flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>{log.totalUrls} URLs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>{log.successCount}</span>
                  </div>
                  {log.failureCount > 0 && (
                    <div className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-red-500" />
                      <span>{log.failureCount}</span>
                    </div>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {formatDuration(log.duration)}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {stats.recentLogs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无运行记录</p>
        </div>
      )}
    </div>
  )
}
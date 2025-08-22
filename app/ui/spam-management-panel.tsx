'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  getSpamManagementDataAction,
  unblockIPAction,
  cleanupSpamDataAction,
} from '@/lib/admin-actions'
import { logger } from '@/lib/logger'

interface SpamStats {
  blockedIPs: number
  activeRateLimits: number
  contentPatterns: number
  config: {
    MAX_COMMENTS_PER_MINUTE: number
    MAX_COMMENTS_PER_HOUR: number
    MAX_CONTENT_LENGTH: number
    IP_BLOCK_DURATION: number
    MAX_VIOLATIONS_BEFORE_BLOCK: number
  }
}

interface SpamManagementData {
  stats: SpamStats
  blockedIPs: string[]
  timestamp: string
}

interface ServerActionResult {
  success: boolean
  message?: string
  error?: string
  data?: unknown
}

export default function SpamManagementPanel() {
  const [data, setData] = useState<SpamManagementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const runServerAction = async (action: () => Promise<ServerActionResult>) => {
    try {
      const result = await action()
      if (result.success) {
        return result
      } else {
        throw new Error(result.error || '操作失败')
      }
    } catch (err) {
      throw err
    }
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const result = await runServerAction(getSpamManagementDataAction)
      setData((result.data as SpamManagementData) || null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败')
      logger.error('SpamManagement', '获取反恶意攻击数据失败', err as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  const unblockIP = async (ipAddress: string) => {
    try {
      await runServerAction(
        () => unblockIPAction(ipAddress) as Promise<ServerActionResult>
      )
      // 刷新数据
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '解封IP失败')
      logger.error('SpamManagement', '解封IP失败', err as Error)
    }
  }

  const cleanupData = async () => {
    try {
      await runServerAction(
        () => cleanupSpamDataAction() as Promise<ServerActionResult>
      )
      // 刷新数据
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '清理数据失败')
      logger.error('SpamManagement', '清理数据失败', err as Error)
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">错误</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <Button onClick={fetchData} className="mt-3" variant="outline">
            重试
          </Button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-gray-500">暂无数据</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-display-sm font-bold">反恶意攻击详情</h1>
        <div className="space-x-2">
          <Button onClick={fetchData} variant="outline">
            刷新数据
          </Button>
          <Button onClick={cleanupData} variant="outline">
            清理过期数据
          </Button>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-body-sm font-medium text-gray-500">被封禁IP</h3>
          <p className="text-display-sm font-bold text-red-600">
            {data.stats.blockedIPs}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-body-sm font-medium text-gray-500">活跃限流</h3>
          <p className="text-display-sm font-bold text-yellow-600">
            {data.stats.activeRateLimits}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-body-sm font-medium text-gray-500">内容模式</h3>
          <p className="text-display-sm font-bold text-blue-600">
            {data.stats.contentPatterns}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-body-sm font-medium text-gray-500">最大评论/分钟</h3>
          <p className="text-display-sm font-bold text-green-600">
            {data.stats.config.MAX_COMMENTS_PER_MINUTE}
          </p>
        </div>
      </div>

      {/* 配置信息 */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-body-lg font-semibold mb-4">防护配置</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body-sm">
          <div>
            <span className="font-medium">每分钟最大评论数:</span>
            <span className="ml-2">
              {data.stats.config.MAX_COMMENTS_PER_MINUTE}
            </span>
          </div>
          <div>
            <span className="font-medium">每小时最大评论数:</span>
            <span className="ml-2">
              {data.stats.config.MAX_COMMENTS_PER_HOUR}
            </span>
          </div>
          <div>
            <span className="font-medium">最大内容长度:</span>
            <span className="ml-2">
              {data.stats.config.MAX_CONTENT_LENGTH} 字符
            </span>
          </div>
          <div>
            <span className="font-medium">IP封禁时长:</span>
            <span className="ml-2">
              {data.stats.config.IP_BLOCK_DURATION / (1000 * 60 * 60)} 小时
            </span>
          </div>
          <div>
            <span className="font-medium">封禁前最大违规次数:</span>
            <span className="ml-2">
              {data.stats.config.MAX_VIOLATIONS_BEFORE_BLOCK}
            </span>
          </div>
        </div>
      </div>

      {/* 被封禁的IP列表 */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-body-lg font-semibold mb-4">被封禁的IP地址</h2>
        {data.blockedIPs.length === 0 ? (
          <p className="text-gray-500">当前没有被封禁的IP地址</p>
        ) : (
          <div className="space-y-2">
            {data.blockedIPs.map((ip) => (
              <div
                key={ip}
                className="flex justify-between items-center p-3 bg-gray-50 rounded"
              >
                <span className="font-mono">{ip}</span>
                <Button
                  onClick={() => unblockIP(ip)}
                  variant="outline"
                  size="sm"
                >
                  解封
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 最后更新时间 */}
      <div className="text-body-sm text-gray-500">
        最后更新: {new Date(data.timestamp).toLocaleString('zh-CN')}
      </div>
    </div>
  )
}

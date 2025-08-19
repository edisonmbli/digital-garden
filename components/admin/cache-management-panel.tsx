'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, RefreshCw, AlertTriangle, CheckCircle, Image, Globe, BarChart3 } from 'lucide-react'
import {
  clearAllCacheAction,
  clearPageCacheAction,
  clearImageCacheAction,
  clearCacheByTypeAction,
  invalidateSpecificPathAction
} from '@/lib/cache-management-actions'
import { notifyCacheUpdate } from '@/lib/cache-events'

interface ClearResult {
  success: boolean
  message: string
  clearedCount?: number
  timestamp: string
}

export function CacheManagementPanel() {
  const [clearResults, setClearResults] = useState<Record<string, ClearResult>>({})
  const [isClearing, setIsClearing] = useState<Record<string, boolean>>({})
  const [selectedContentType, setSelectedContentType] = useState<string>('')
  const [customPath, setCustomPath] = useState('')

  const handleClearCache = async (type: string, action: () => Promise<{ success: boolean; message?: string; clearedCount?: number; data?: unknown }>) => {
    setIsClearing(prev => ({ ...prev, [type]: true }))
    try {
      const result = await action()
      if (result.success) {
        setClearResults(prev => ({
          ...prev,
          [type]: {
            success: true,
            message: result.message || '清理成功',
            clearedCount: result.clearedCount,
            timestamp: new Date().toISOString(),
          },
        }))
        // 通知监控组件刷新数据
        notifyCacheUpdate()
      } else {
        setClearResults(prev => ({
          ...prev,
          [type]: {
            success: false,
            message: result.message || '清理失败',
            timestamp: new Date().toISOString(),
          },
        }))
      }
    } catch {
      setClearResults(prev => ({
        ...prev,
        [type]: {
          success: false,
          message: '清理操作失败',
          timestamp: new Date().toISOString(),
        },
      }))
    } finally {
      setIsClearing(prev => ({ ...prev, [type]: false }))
    }
  }

  const clearAllCache = () => handleClearCache('all', clearAllCacheAction)
  const clearPageCache = () => handleClearCache('page', clearPageCacheAction)
  const clearImageCache = () => handleClearCache('image', clearImageCacheAction)
  const clearByContentType = () => {
    if (!selectedContentType) {
      alert('请选择内容类型')
      return
    }
    handleClearCache(
      `type-${selectedContentType}`,
      () => clearCacheByTypeAction(selectedContentType)
    )
  }
  const invalidateCustomPath = () => {
    if (!customPath) {
      alert('请输入路径')
      return
    }
    handleClearCache(
      `path-${customPath}`,
      () => invalidateSpecificPathAction(customPath)
    )
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* 全局缓存清理 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              全局缓存清理
            </CardTitle>
            <CardDescription>
              清理所有类型的缓存，包括页面缓存、图片缓存和 CDN 缓存
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={clearAllCache}
              disabled={isClearing.all}
              variant="destructive"
              className="w-full"
            >
              {isClearing.all ? '清理中...' : '清理所有缓存'}
            </Button>
            {clearResults.all && (
              <div className={`p-3 rounded-lg border ${
                clearResults.all.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {clearResults.all.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-body-sm font-medium">{clearResults.all.message}</span>
                </div>
                {clearResults.all.clearedCount && (
                  <p className="text-caption-xs text-muted-foreground mt-1">
                    清理了 {clearResults.all.clearedCount} 个缓存条目
                  </p>
                )}
                <p className="text-caption-xs text-muted-foreground mt-1">
                  {formatTimestamp(clearResults.all.timestamp)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 页面缓存清理 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              页面缓存清理
            </CardTitle>
            <CardDescription>
              清理 Next.js 页面缓存和路由缓存
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={clearPageCache}
              disabled={isClearing.page}
              className="w-full"
            >
              {isClearing.page ? '清理中...' : '清理页面缓存'}
            </Button>
            {clearResults.page && (
              <div className={`p-3 rounded-lg border ${
                clearResults.page.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {clearResults.page.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-body-sm font-medium">{clearResults.page.message}</span>
                </div>
                <p className="text-caption-xs text-muted-foreground mt-1">
                  {formatTimestamp(clearResults.page.timestamp)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 图片缓存清理 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              图片缓存清理
            </CardTitle>
            <CardDescription>
              清理 Cloudflare 图片缓存和优化缓存
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={clearImageCache}
              disabled={isClearing.image}
              variant="outline"
              className="w-full"
            >
              {isClearing.image ? '清理中...' : '清理图片缓存'}
            </Button>
            {clearResults.image && (
              <div className={`p-3 rounded-lg border ${
                clearResults.image.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {clearResults.image.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-body-sm font-medium">{clearResults.image.message}</span>
                </div>
                <p className="text-caption-xs text-muted-foreground mt-1">
                  {formatTimestamp(clearResults.image.timestamp)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 按内容类型清理 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              按内容类型清理
            </CardTitle>
            <CardDescription>
              根据内容类型精准清理相关缓存
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              value={selectedContentType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedContentType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">选择内容类型</option>
              <option value="collections">合集 (Collections)</option>
              <option value="logs">日志 (Logs)</option>
              <option value="photos">照片 (Photos)</option>
              <option value="dev-collections">开发合集 (Dev Collections)</option>
              <option value="authors">作者 (Authors)</option>
            </select>
            <Button
              onClick={clearByContentType}
              disabled={isClearing[`type-${selectedContentType}`] || !selectedContentType}
              variant="outline"
              className="w-full"
            >
              {isClearing[`type-${selectedContentType}`] ? '清理中...' : '清理选定类型缓存'}
            </Button>
            {clearResults[`type-${selectedContentType}`] && (
              <div className={`p-3 rounded-lg border ${
                clearResults[`type-${selectedContentType}`].success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {clearResults[`type-${selectedContentType}`].success ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-body-sm font-medium">
                    {clearResults[`type-${selectedContentType}`].message}
                  </span>
                </div>
                <p className="text-caption-xs text-muted-foreground mt-1">
                  {formatTimestamp(clearResults[`type-${selectedContentType}`].timestamp)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 自定义路径失效 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            自定义路径失效
          </CardTitle>
          <CardDescription>
            手动失效指定路径的缓存
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={customPath}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomPath(e.target.value)}
              placeholder="例如: /zh/collections/nature"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              onClick={invalidateCustomPath}
              disabled={isClearing[`path-${customPath}`] || !customPath}
              variant="outline"
            >
              {isClearing[`path-${customPath}`] ? '失效中...' : '失效路径'}
            </Button>
          </div>
          {clearResults[`path-${customPath}`] && (
            <div className={`p-3 rounded-lg border ${
              clearResults[`path-${customPath}`].success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {clearResults[`path-${customPath}`].success ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-body-sm font-medium">
                  {clearResults[`path-${customPath}`].message}
                </span>
              </div>
              <p className="text-caption-xs text-muted-foreground mt-1">
                {formatTimestamp(clearResults[`path-${customPath}`].timestamp)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
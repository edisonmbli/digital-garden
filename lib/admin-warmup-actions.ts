'use server'

import { auth } from '@clerk/nextjs/server'
import { performImageWarmup } from '@/lib/warmup-utils'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'

// 检查管理员权限
async function checkAdminAccess(): Promise<boolean> {
  try {
    const authResult = await auth()
    const { userId, sessionClaims, getToken } = authResult

    if (!userId) {
      return false
    }

    // 优先尝试从自定义 JWT 模板获取角色信息
    try {
      const customToken = await getToken({ template: 'default' })
      if (customToken) {
        const payload = JSON.parse(atob(customToken.split('.')[1]))
        const customMetadata = payload?.metadata as Record<string, unknown> | undefined
        if (customMetadata?.role === 'admin') {
          return true
        }
      }
    } catch {
      // JWT 模板获取失败，继续使用兜底方案
    }

    // 兜底方案1：检查 sessionClaims 中的 metadata
    const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined
    const publicMetadata = sessionClaims?.publicMetadata as Record<string, unknown> | undefined

    if (metadata?.role === 'admin' || publicMetadata?.role === 'admin') {
      return true
    }

    // 兜底方案2：通过 Clerk API 获取用户信息
    try {
      const { clerkClient } = await import('@clerk/nextjs/server')
      const client = await clerkClient()
      const user = await client.users.getUser(userId)
      if (user.publicMetadata?.role === 'admin') {
        return true
      }
    } catch {
      // API 调用失败，拒绝访问
    }

    return false
  } catch {
    return false
  }
}

type WarmupRequest = {
  type: 'collection-covers' | 'featured-photos' | 'dev-collections' | 'custom'
  limit: number
  sizes: string[]
  formats: string[]
  customImageIds?: string[]
}

type WarmupResult = {
  success: boolean
  totalUrls: number
  successCount: number
  failureCount: number
  duration: number
  errors: string[]
  message?: string
}

// 执行预热操作
export async function executeWarmup(request: WarmupRequest): Promise<WarmupResult> {
  try {
    // 验证管理员权限
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      return {
        success: false,
        totalUrls: 0,
        successCount: 0,
        failureCount: 0,
        duration: 0,
        errors: [],
        message: '权限不足：需要管理员权限'
      }
    }

    const { type, limit, sizes, formats, customImageIds } = request

    // 验证请求参数
    if (!type || !sizes || !formats || sizes.length === 0 || formats.length === 0) {
      return {
        success: false,
        totalUrls: 0,
        successCount: 0,
        failureCount: 0,
        duration: 0,
        errors: [],
        message: '缺少必要参数：type, sizes, formats'
      }
    }

    if (type === 'custom' && (!customImageIds || customImageIds.length === 0)) {
      return {
        success: false,
        totalUrls: 0,
        successCount: 0,
        failureCount: 0,
        duration: 0,
        errors: [],
        message: '自定义类型需要提供图片ID列表'
      }
    }

    // 限制参数范围
    if (limit < 1 || limit > 100) {
      return {
        success: false,
        totalUrls: 0,
        successCount: 0,
        failureCount: 0,
        duration: 0,
        errors: [],
        message: '数量限制必须在 1-100 之间'
      }
    }

    // 执行预热
    const startTime = Date.now()
    const result = await performImageWarmup({
      type,
      limit,
      sizes,
      formats,
      customImageIds,
    })
    const duration = Date.now() - startTime

    // 保存预热日志到数据库
    try {
      await prisma.warmupLog.create({
        data: {
          type,
          totalUrls: result.total,
          successCount: result.success,
          failureCount: result.failed,
          duration,
          success: result.failed === 0,
          errors: result.errors,
          config: {
            limit: type === 'custom' ? customImageIds!.length : limit,
            sizes,
            formats,
            customImageIds: customImageIds || []
          },
          createdBy: (await auth()).userId!,
        },
      })
    } catch (dbError) {
      console.error('Failed to save warmup log to database:', dbError)
      // 不影响预热操作的返回结果
    }

    // 记录预热日志到控制台
    console.log('Admin warmup completed:', {
      type,
      limit: type === 'custom' ? customImageIds!.length : limit,
      sizes,
      formats,
      result,
      duration,
      timestamp: new Date().toISOString(),
    })

    // 重新验证缓存
    revalidatePath('/admin/warmup')

    return {
      success: result.failed === 0,
      totalUrls: result.total,
      successCount: result.success,
      failureCount: result.failed,
      duration,
      errors: result.errors,
      message: result.failed === 0 ? '预热完成' : `预热完成，但有 ${result.failed} 个失败`
    }
  } catch (error) {
    console.error('Admin warmup error:', error)
    return {
      success: false,
      totalUrls: 0,
      successCount: 0,
      failureCount: 0,
      duration: 0,
      errors: [],
      message: `预热执行失败: ${error instanceof Error ? error.message : '未知错误'}`
    }
  }
}

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

// 从数据库获取预热日志数据
async function getWarmupLogsFromDB(): Promise<WarmupLog[]> {
  try {
    const logs = await prisma.warmupLog.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // 最多获取50条记录
    })

    return logs.map(log => ({
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      type: log.type,
      totalUrls: log.totalUrls,
      successCount: log.successCount,
      failureCount: log.failureCount,
      duration: log.duration,
      success: log.success,
    }))
  } catch (error) {
    console.error('Failed to fetch warmup logs from database:', error)
    return []
  }
}

// 获取预热统计数据
export async function getWarmupStats(): Promise<WarmupStats | { error: string }> {
  try {
    // 验证管理员权限
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      return { error: '权限不足：需要管理员权限' }
    }

    // 从数据库获取预热日志
    const logs = await getWarmupLogsFromDB()

    // 计算统计数据
    const totalRuns = logs.length
    const successfulRuns = logs.filter(log => log.success).length
    const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0
    const averageDuration = totalRuns > 0 
      ? logs.reduce((sum, log) => sum + log.duration, 0) / totalRuns 
      : 0
    const lastRun = logs.length > 0 
      ? logs[0].timestamp // 已按时间倒序排列
      : undefined

    // 获取最近的日志（按时间倒序，最多10条）
    const recentLogs = logs.slice(0, 10)

    return {
      totalRuns,
      successRate,
      averageDuration,
      lastRun,
      recentLogs,
    }
  } catch (error) {
    console.error('Get warmup stats error:', error)
    return { error: `获取统计数据失败: ${error instanceof Error ? error.message : '未知错误'}` }
  }
}
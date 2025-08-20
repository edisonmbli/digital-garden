'use server'

import { auth } from '@clerk/nextjs/server'
import { performImageWarmupWithProgress, getWarmupTargetInfo, type AdminWarmupConfig, type WarmupResult } from '@/lib/warmup-utils'
import { getCollectionsForWarmup, getCollectionPhotoCount } from '@/lib/dal'
import prisma from '@/lib/prisma'

// 检查管理员权限
export async function checkAdminAccess(): Promise<boolean> {
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

// 获取合集列表（用于客户端选择）
export async function getCollectionsForWarmupAction() {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    throw new Error('权限不足：需要管理员权限')
  }
  
  return await getCollectionsForWarmup()
}

// 获取合集照片数量
export async function getCollectionPhotoCountAction(collectionId: string) {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    throw new Error('权限不足：需要管理员权限')
  }
  
  return await getCollectionPhotoCount(collectionId)
}

// 获取预热类型的图片数量
export async function getWarmupImageCountAction(type: 'cover-images' | 'dev-collections') {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    throw new Error('权限不足：需要管理员权限')
  }
  
  try {
    const config: AdminWarmupConfig = {
      type,
      limit: 1000, // 设置一个较大的值来获取所有图片
      sizes: ['400'], // 临时值，不影响计数
      formats: ['webp'] // 临时值，不影响计数
    }
    
    const targetInfo = await getWarmupTargetInfo(config)
    return {
      count: targetInfo.totalCount,
      description: targetInfo.description
    }
  } catch (error) {
    console.error('获取预热图片数量失败:', error)
    return {
      count: 0,
      description: '获取失败'
    }
  }
}

// 内存中存储进度状态（在生产环境中应该使用Redis或数据库）
const progressStore = new Map<string, {
  current: number
  total: number
  currentUrl: string
  status: 'processing' | 'success' | 'error'
  message?: string
  completed: boolean
  result?: WarmupResult
  startTime: number
}>()

// 生成唯一的任务ID
function generateTaskId(): string {
  return `warmup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 启动预热任务
export async function startWarmupTask(config: AdminWarmupConfig): Promise<{ taskId: string }> {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    throw new Error('权限不足：需要管理员权限')
  }

  // 验证请求参数
  if (!config.type || !config.sizes || !config.formats || config.sizes.length === 0 || config.formats.length === 0) {
    throw new Error('缺少必要参数：type, sizes, formats')
  }

  if (config.type === 'custom' && (!config.customImageIds || config.customImageIds.length === 0)) {
    throw new Error('自定义类型需要提供图片ID列表')
  }

  if (config.type === 'collection' && !config.targetId) {
    throw new Error('Collection类型需要指定targetId')
  }

  // 先获取目标信息以验证
  try {
    const targetInfo = await getWarmupTargetInfo(config)
    console.log('预热目标信息:', targetInfo)
  } catch (error) {
    throw new Error(`获取预热目标失败: ${error instanceof Error ? error.message : String(error)}`)
  }

  // 生成任务ID
  const taskId = generateTaskId()

  // 初始化进度状态
  progressStore.set(taskId, {
    current: 0,
    total: 0,
    currentUrl: '',
    status: 'processing',
    completed: false,
    startTime: Date.now()
  })

  // 异步执行预热任务（不等待完成）
  performImageWarmupWithProgress(
    config,
    (progress) => {
      // 更新进度
      const currentProgress = progressStore.get(taskId)
      if (currentProgress) {
        progressStore.set(taskId, {
          ...currentProgress,
          ...progress,
          completed: false
        })
      }
    },
    20 // 批次大小
  ).then(async (result) => {
    // 任务完成，更新最终状态
    const currentProgress = progressStore.get(taskId)
    if (currentProgress) {
      progressStore.set(taskId, {
        ...currentProgress,
        completed: true,
        result,
        status: result.success ? 'success' : 'error',
        message: result.success ? '预热完成' : `预热失败: ${result.errors.join(', ')}`
      })
    }

    // 保存预热日志到数据库
    try {
      const duration = Date.now() - (currentProgress?.startTime || Date.now())
      const userId = (await auth()).userId
      
      await prisma.warmupLog.create({
        data: {
          type: config.type,
          totalUrls: result.totalUrls,
          successCount: result.successCount,
          failureCount: result.failureCount,
          duration,
          success: result.success,
          errors: result.errors,
          config: {
            limit: config.type === 'custom' ? (config.customImageIds?.length || 0) : config.limit,
            sizes: config.sizes,
            formats: config.formats,
            customImageIds: config.customImageIds || [],
            targetId: config.targetId
          },
          createdBy: userId || 'unknown',
        },
      })
      console.log('预热日志已保存到数据库')
    } catch (dbError) {
      console.error('保存预热日志到数据库失败:', dbError)
    }

    // 30秒后清理进度数据
    setTimeout(() => {
      progressStore.delete(taskId)
    }, 30000)
  }).catch((error) => {
    // 任务失败
    const currentProgress = progressStore.get(taskId)
    if (currentProgress) {
      progressStore.set(taskId, {
        ...currentProgress,
        completed: true,
        status: 'error',
        message: `预热失败: ${error instanceof Error ? error.message : String(error)}`
      })
    }

    // 30秒后清理进度数据
    setTimeout(() => {
      progressStore.delete(taskId)
    }, 30000)
  })

  return { taskId }
}

// 获取预热进度
export async function getWarmupProgress(taskId: string) {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    throw new Error('权限不足：需要管理员权限')
  }

  if (!taskId) {
    throw new Error('缺少taskId参数')
  }

  const progress = progressStore.get(taskId)
  if (!progress) {
    throw new Error('任务不存在或已过期')
  }

  return progress
}

// 清理过期的进度数据（可以定期调用）
export async function cleanupExpiredProgress() {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    throw new Error('权限不足：需要管理员权限')
  }

  const now = Date.now()
  const expiredTasks: string[] = []

  for (const [taskId, progress] of progressStore.entries()) {
    // 清理超过5分钟的任务
    if (now - progress.startTime > 5 * 60 * 1000) {
      expiredTasks.push(taskId)
    }
  }

  expiredTasks.forEach(taskId => progressStore.delete(taskId))
  
  return { cleanedCount: expiredTasks.length }
}
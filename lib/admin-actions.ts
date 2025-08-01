'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import * as commentsDal from '@/lib/dal-comments'
import { getSpamStats, getBlockedIPs, unblockIP, cleanupExpiredData } from '@/lib/anti-spam'
import { CommentStatus } from '@/types'

/**
 * 检查当前用户是否为管理员
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { userId, sessionClaims } = await auth()
    
    if (!userId) {
      return false
    }

    // 方法1: 通过自定义 JWT 模板检查 (推荐，性能更好)
    const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined
    if (metadata?.role === 'admin') {
      return true
    }

    // 方法2: 通过 sessionClaims 检查
    const publicMetadata = sessionClaims?.publicMetadata as Record<string, unknown> | undefined
    if (publicMetadata?.role === 'admin') {
      return true
    }

    // 方法3: 通过 Clerk API 检查 (备用方案)
    try {
      const client = await clerkClient()
      const user = await client.users.getUser(userId)
      
      const userRoleFromAPI = user.publicMetadata?.role
      const isAdmin = userRoleFromAPI === 'admin'
      
      return isAdmin
    } catch {
      return false
    }

  } catch {
    return false
  }
}

// 运行系统测试
export async function runSystemTestsAction() {
  try {
    await verifyAdminAccess()
    
    const tests = []
    
    // 数据库连接测试
    try {
      await prisma.$queryRaw`SELECT 1`
      tests.push({
        name: '数据库连接测试',
        success: true,
        message: 'Prisma 数据库连接正常'
      })
    } catch (error) {
      tests.push({
        name: '数据库连接测试',
        success: false,
        message: `数据库连接失败: ${error instanceof Error ? error.message : '未知错误'}`
      })
    }
    
    // 评论系统测试
    try {
      const commentCount = await prisma.comment.count()
      tests.push({
        name: '评论系统测试',
        success: true,
        message: `评论系统正常，当前共有 ${commentCount} 条评论`
      })
    } catch (error) {
      tests.push({
        name: '评论系统测试',
        success: false,
        message: `评论系统测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      })
    }
    
    // 反垃圾系统测试
    try {
      const spamStats = getSpamStats()
      tests.push({
        name: '反垃圾系统测试',
        success: true,
        message: `反垃圾系统正常，当前活跃限流规则: ${spamStats.activeRateLimits}`
      })
    } catch (error) {
      tests.push({
        name: '反垃圾系统测试',
        success: false,
        message: `反垃圾系统测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      })
    }
    
    // Webhook 系统测试
    try {
      const webhookCount = await prisma.webhookCall.count()
      tests.push({
        name: 'Webhook 系统测试',
        success: true,
        message: `Webhook 系统正常，共记录 ${webhookCount} 次调用`
      })
    } catch (error) {
      tests.push({
        name: 'Webhook 系统测试',
        success: false,
        message: `Webhook 系统测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      })
    }
    
    const passed = tests.filter(test => test.success).length
    const failed = tests.filter(test => !test.success).length
    const total = tests.length
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) + '%' : '0%'
    
    return {
      success: true,
      data: {
        results: tests,
        summary: {
          total,
          passed,
          failed,
          passRate
        }
      },
      message: '系统测试完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '系统测试失败'
    }
  }
}

// 清理过期数据 (别名)
export async function cleanupExpiredDataAction() {
  return cleanupSpamDataAction()
}

// 重置垃圾邮件系统
export async function resetSpamSystemAction() {
  try {
    await verifyAdminAccess()
    
    // 清理内存中的数据
    cleanupExpiredData()
    
    // 清理数据库中的垃圾检测日志（可选，谨慎使用）
    const deletedLogs = await prisma.spamDetectionLog.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 删除24小时前的日志
        }
      }
    })
    
    revalidatePath('/admin/spam-management')
    
    return {
      success: true,
      message: `垃圾邮件系统重置完成，清理了 ${deletedLogs.count} 条历史日志`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '重置垃圾邮件系统失败'
    }
  }
}

// 测试敏感词检测
export async function testSensitiveWordsAction(content: string) {
  try {
    await verifyAdminAccess()
    
    // 这里应该调用敏感词检测逻辑
    // 暂时返回模拟数据
    const foundWords: string[] = []
    const sensitiveWords = ['测试敏感词', '垃圾', '广告'] // 示例敏感词
    
    for (const word of sensitiveWords) {
      if (content.includes(word)) {
        foundWords.push(word)
      }
    }
    
    return {
      success: true,
      data: {
        content,
        contentLength: content.length,
        hasSensitiveWords: foundWords.length > 0,
        foundWords,
        wordsCount: foundWords.length
      },
      message: '敏感词检测完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '敏感词检测失败'
    }
  }
}

// 验证管理员权限的辅助函数
async function verifyAdminAccess() {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('未登录')
  }
  
  const adminCheck = await isAdmin()
  
  if (!adminCheck) {
    throw new Error('权限不足：需要管理员权限')
  }
  
  return userId
}

// 数据库连接测试
export async function testDatabaseConnectionAction() {
  try {
    await verifyAdminAccess()
    const result = await commentsDal.testDatabaseConnection()
    return {
      success: true,
      data: result,
      message: '数据库连接测试完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '测试失败'
    }
  }
}

// 获取垃圾邮件管理数据
export async function getSpamManagementDataAction() {
  try {
    await verifyAdminAccess()
    
    cleanupExpiredData()
    
    const stats = getSpamStats()
    const blockedIPs = getBlockedIPs()
    
    return {
      success: true,
      data: {
        stats,
        blockedIPs,
        timestamp: new Date().toISOString()
      },
      message: '垃圾邮件管理数据获取完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取数据失败'
    }
  }
}

// 解封IP地址
export async function unblockIPAction(ipAddress: string) {
  try {
    await verifyAdminAccess()
    
    const ipSchema = z.string().min(1).max(45)
    const validatedIP = ipSchema.parse(ipAddress)
    
    const unblocked = unblockIP(validatedIP)
    
    revalidatePath('/admin/spam-management')
    
    return {
      success: true,
      data: { 
        ipAddress: validatedIP, 
        unblocked 
      },
      message: unblocked ? 'IP解封成功' : 'IP未在封禁列表中'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '解封IP失败'
    }
  }
}

// 清理过期数据
export async function cleanupSpamDataAction() {
  try {
    await verifyAdminAccess()
    
    cleanupExpiredData()
    
    revalidatePath('/admin/spam-management')
    
    return {
      success: true,
      message: '过期数据清理完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '清理数据失败'
    }
  }
}

// 创建作者回复
export async function createAuthorReplyAction({
  parentCommentId,
  content,
}: {
  parentCommentId: string
  content: string
}) {
  try {
    await verifyAdminAccess()

    const authResult = await auth()
    const userId = authResult.userId
    if (!userId) {
      return { success: false, error: '用户未登录' }
    }

    const parentComment = await commentsDal.getCommentById(parentCommentId)
    if (!parentComment) {
      return { success: false, error: '父评论不存在' }
    }

    const reply = await commentsDal.createAuthorReply({
      content,
      postId: parentComment.postId,
      userId,
      parentId: parentCommentId,
    })

    return { 
      success: true, 
      message: '回复成功',
      data: reply
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '创建回复失败' 
    }
  }
}

// 获取系统统计信息
export async function getSystemStatsAction() {
  try {
    await verifyAdminAccess()
    
    const [
      totalComments,
      pendingComments,
      approvedComments,
      rejectedComments,
      spamStats
    ] = await Promise.all([
      prisma.comment.count(),
      prisma.comment.count({ where: { status: 'PENDING' } }),
      prisma.comment.count({ where: { status: 'APPROVED' } }),
      prisma.comment.count({ where: { status: 'REJECTED' } }),
      getSpamStats()
    ])
    
    return {
      success: true,
      data: {
        comments: {
          total: totalComments,
          pending: pendingComments,
          approved: approvedComments,
          rejected: rejectedComments
        },
        spam: spamStats,
        timestamp: new Date().toISOString()
      },
      message: '系统统计信息获取完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取统计信息失败'
    }
  }
}

// 获取评论统计信息（管理后台用）
export async function getCommentStatsAction() {
  try {
    await verifyAdminAccess()
    
    const [
      total,
      pending,
      approved,
      rejected,
      pinned
    ] = await Promise.all([
      prisma.comment.count(),
      prisma.comment.count({ where: { status: 'PENDING' } }),
      prisma.comment.count({ where: { status: 'APPROVED' } }),
      prisma.comment.count({ where: { status: 'REJECTED' } }),
      prisma.comment.count({ where: { isPinned: true } })
    ])
    
    return {
      success: true,
      data: {
        total,
        pending,
        approved,
        rejected,
        pinned
      },
      message: '评论统计信息获取完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取评论统计信息失败'
    }
  }
}

// 获取管理后台评论列表
export async function getCommentsForAdminAction(options: {
  contentType?: 'photo' | 'log'
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED' | 'all'
  search?: string
  page?: number
  limit?: number
  sortBy?: 'newest' | 'oldest' | 'status' | 'pinned'
}) {
  try {
    await verifyAdminAccess()
    
    const result = await commentsDal.getCommentsForAdmin({
      ...options,
      status: options.status === 'all' ? 'all' : (options.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED')
    })
    
    return {
      success: true,
      data: result,
      message: '评论列表获取完成'
    }
  } catch (error) {
    console.error('获取评论列表失败:', error)
    return {
      success: false,
      error: '获取评论列表失败',
      message: '系统错误，请稍后重试'
    }
  }
}

// 批量更新评论
export async function batchUpdateCommentsAction({
  commentIds,
  action
}: {
  commentIds: string[]
  action: 'approve' | 'reject' | 'delete' | 'pin' | 'unpin'
}) {
  try {
    const userId = await verifyAdminAccess()
    
    const result = await commentsDal.batchUpdateComments(
      commentIds,
      action,
      userId,
      undefined, // moderatorName 可以从用户信息获取
      undefined  // reason 可选
    )
    
    revalidatePath('/admin/comments')
    
    return {
      success: true,
      data: result,
      message: `批量${action}操作完成`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '批量操作失败'
    }
  }
}

// 更新单个评论
export async function updateCommentAction({
  commentId,
  content,
  status,
  isPinned,
  action,
  reason
}: {
  commentId: string
  content?: string
  status?: CommentStatus
  isPinned?: boolean
  action?: 'approve' | 'reject' | 'delete' | 'pin' | 'unpin'
  reason?: string
}) {
  try {
    const userId = await verifyAdminAccess()
    
    // 如果提供了action参数，根据action执行相应操作
    if (action) {
      switch (action) {
        case 'approve':
          const approveResult = await commentsDal.approveComment(commentId, userId)
          revalidatePath('/admin/comments')
          return {
            success: true,
            data: approveResult,
            message: '评论审核通过'
          }
          
        case 'reject':
          const rejectResult = await commentsDal.rejectComment(commentId, userId, '管理员', reason || '审核不通过')
          revalidatePath('/admin/comments')
          return {
            success: true,
            data: rejectResult,
            message: '评论已拒绝'
          }
          
        case 'delete':
          const deleteResult = await commentsDal.softDeleteComment(commentId, userId, '管理员', reason || '管理员删除')
          revalidatePath('/admin/comments')
          return {
            success: true,
            data: deleteResult,
            message: '评论已删除'
          }
          
        case 'pin':
          const pinResult = await commentsDal.pinComment(commentId, userId)
          revalidatePath('/admin/comments')
          return {
            success: true,
            data: pinResult,
            message: '评论置顶成功'
          }
          
        case 'unpin':
          const unpinResult = await commentsDal.unpinComment(commentId)
          revalidatePath('/admin/comments')
          return {
            success: true,
            data: unpinResult,
            message: '取消置顶成功'
          }
          
        default:
          throw new Error(`不支持的操作: ${action}`)
      }
    }
    
    // 如果没有action参数，使用原有的更新逻辑
    const updateData: {
      content?: string
      status?: CommentStatus
      moderatedBy?: string
      isPinned?: boolean
      pinnedBy?: string
    } = {}
    
    if (content !== undefined) {
      updateData.content = content
    }
    
    if (status !== undefined) {
      updateData.status = status
      updateData.moderatedBy = userId
    }
    
    if (isPinned !== undefined) {
      updateData.isPinned = isPinned
      if (isPinned) {
        updateData.pinnedBy = userId
      }
    }
    
    const result = await commentsDal.updateComment(commentId, updateData)
    
    revalidatePath('/admin/comments')
    
    return {
      success: true,
      data: result,
      message: '评论更新完成'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '更新评论失败'
    }
  }
}
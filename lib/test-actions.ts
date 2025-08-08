// lib/test-actions.ts - 测试专用的Server Actions，跳过身份验证
'use server'

import { z } from 'zod'
import * as commentsDal from '@/lib/dal-comments'
import type { CreateCommentInput, UpdateCommentInput } from '@/types'
import { logger } from './logger'

// 测试用的创建评论Action（跳过身份验证）
export async function testCreateCommentAction(input: {
  content: string
  postId: string
  parentId?: string
  userId?: string // 测试时可以指定用户ID
}) {
  try {
    // 验证输入
    const contentValidation = z.string().min(1).max(2000).safeParse(input.content)
    if (!contentValidation.success) {
      return {
        success: false,
        error: contentValidation.error.issues[0].message,
        code: 'VALIDATION_ERROR'
      }
    }

    const postIdValidation = z.string().min(1).safeParse(input.postId)
    if (!postIdValidation.success) {
      return {
        success: false,
        error: '无效的文章ID',
        code: 'VALIDATION_ERROR'
      }
    }

    // 使用提供的用户ID或默认测试用户ID
    const userId = input.userId || 'test-actions-user'

    const commentInput: CreateCommentInput = {
      content: input.content,
      postId: input.postId,
      userId,
      parentId: input.parentId || undefined,
      ipAddress: undefined,
      userAgent: undefined
    }

    const comment = await commentsDal.createComment(commentInput)

    return {
      success: true,
      message: '评论创建成功',
      data: comment
    }
  } catch (error) {
    logger.error('TestActions', 'Test create comment action error', error as Error)
    return {
      success: false,
      error: '发表评论失败，请稍后重试',
      code: 'INTERNAL_ERROR'
    }
  }
}

// 测试用的更新评论Action（跳过身份验证）
export async function testUpdateCommentAction(commentId: string, input: {
  content: string
  userId?: string // 测试时可以指定用户ID
}) {
  try {
    // 验证输入
    const commentIdValidation = z.string().min(1).safeParse(commentId)
    if (!commentIdValidation.success) {
      return {
        success: false,
        error: '无效的评论ID',
        code: 'VALIDATION_ERROR'
      }
    }

    const contentValidation = z.string().min(1).max(2000).safeParse(input.content)
    if (!contentValidation.success) {
      return {
        success: false,
        error: contentValidation.error.issues[0].message,
        code: 'VALIDATION_ERROR'
      }
    }

    // 使用提供的用户ID或默认测试用户ID（这里不需要使用，仅为测试）
    // const userId = input.userId || 'test-actions-user'

    const updateInput: UpdateCommentInput = {
      content: input.content
    }

    const comment = await commentsDal.updateComment(commentId, updateInput)

    return {
      success: true,
      message: '评论更新成功',
      data: comment
    }
  } catch (error) {
    logger.error('TestActions', 'Test update comment action error', error as Error)
    return {
      success: false,
      error: '更新评论失败，请稍后重试',
      code: 'INTERNAL_ERROR'
    }
  }
}

// 测试用的删除评论Action（跳过身份验证）
export async function testDeleteCommentAction(commentId: string, userId?: string, reason?: string) {
  try {
    const commentIdValidation = z.string().min(1).safeParse(commentId)
    if (!commentIdValidation.success) {
      return {
        success: false,
        error: '无效的评论ID',
        code: 'VALIDATION_ERROR'
      }
    }

    // 使用提供的用户ID或默认测试用户ID
    const testUserId = userId || 'test-actions-user'

    const comment = await commentsDal.softDeleteComment(commentId, testUserId, '测试用户', reason)

    return {
      success: true,
      message: '评论删除成功',
      data: comment
    }
  } catch (error) {
    logger.error('TestActions', 'Test delete comment action error', error as Error)
    return {
      success: false,
      error: '删除评论失败，请稍后重试',
      code: 'INTERNAL_ERROR'
    }
  }
}

// 测试用的审核通过Action（跳过身份验证）
export async function testApproveCommentAction(commentId: string, reason?: string, userId?: string) {
  try {
    const commentIdValidation = z.string().min(1).safeParse(commentId)
    if (!commentIdValidation.success) {
      return {
        success: false,
        error: '无效的评论ID',
        code: 'VALIDATION_ERROR'
      }
    }

    // 使用提供的用户ID或默认测试用户ID
    const moderatorId = userId || 'test-actions-user'

    const comment = await commentsDal.approveComment(commentId, moderatorId, reason)

    return {
      success: true,
      message: '评论审核通过',
      data: comment
    }
  } catch (error) {
    logger.error('TestActions', 'Test approve comment action error', error as Error)
    return {
      success: false,
      error: '审核操作失败，请稍后重试',
      code: 'INTERNAL_ERROR'
    }
  }
}

// 测试用的拒绝评论Action（跳过身份验证）
export async function testRejectCommentAction(commentId: string, reason?: string, userId?: string) {
  try {
    const commentIdValidation = z.string().min(1).safeParse(commentId)
    if (!commentIdValidation.success) {
      return {
        success: false,
        error: '无效的评论ID',
        code: 'VALIDATION_ERROR'
      }
    }

    // 使用提供的用户ID或默认测试用户ID
    const moderatorId = userId || 'test-actions-user'

    const comment = await commentsDal.rejectComment(commentId, moderatorId, reason)

    return {
      success: true,
      message: '评论已拒绝',
      data: comment
    }
  } catch (error) {
    logger.error('TestActions', 'Test reject comment action error', error as Error)
    return {
      success: false,
      error: '审核操作失败，请稍后重试',
      code: 'INTERNAL_ERROR'
    }
  }
}

// 测试用的置顶评论Action（跳过身份验证）
export async function testPinCommentAction(commentId: string, userId?: string) {
  try {
    const commentIdValidation = z.string().min(1).safeParse(commentId)
    if (!commentIdValidation.success) {
      return {
        success: false,
        error: '无效的评论ID',
        code: 'VALIDATION_ERROR'
      }
    }

    // 使用提供的用户ID或默认测试用户ID
    const pinnedBy = userId || 'test-actions-user'

    const comment = await commentsDal.pinComment(commentId, pinnedBy)

    return {
      success: true,
      message: '评论置顶成功',
      data: comment
    }
  } catch (error) {
    logger.error('TestActions', 'Test pin comment action error', error as Error)
    return {
      success: false,
      error: '置顶操作失败，请稍后重试',
      code: 'INTERNAL_ERROR'
    }
  }
}

// 测试用的取消置顶Action（跳过身份验证）
export async function testUnpinCommentAction(commentId: string) {
  try {
    const commentIdValidation = z.string().min(1).safeParse(commentId)
    if (!commentIdValidation.success) {
      return {
        success: false,
        error: '无效的评论ID',
        code: 'VALIDATION_ERROR'
      }
    }

    // 使用提供的用户ID或默认测试用户ID（unpinComment不需要用户ID参数）
    // const testUserId = userId || 'test-actions-user'

    const comment = await commentsDal.unpinComment(commentId)

    return {
      success: true,
      message: '取消置顶成功',
      data: comment
    }
  } catch (error) {
    logger.error('TestActions', 'Test unpin comment action error', error as Error)
    return {
      success: false,
      error: '取消置顶操作失败，请稍后重试',
      code: 'INTERNAL_ERROR'
    }
  }
}
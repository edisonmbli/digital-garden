// app/lib/actions.ts
'use server'

import { PHOTOS_PER_PAGE } from './dal'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import * as dal from './dal'
import * as commentsDal from './dal-comments'
import { type Locale } from '@/i18n-config'
import { checkRateLimit } from './rate-limit'
import { checkSpam } from './anti-spam'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { CommentStatus, type CreateCommentInput, type UpdateCommentInput } from '@/types'

// ================================================= //
//                   照片相关Actions                  //
// ================================================= //

// 加载更多照片的 Server Action
export async function loadMorePhotosAction(
  slug: string,
  lang: Locale,
  page: number
) {
  // 我们直接复用 DAL 函数来获取下一页的数据
  const groupData = await dal.getGroupAndPhotosBySlug(slug, lang, page)

  // 确保 groupData 存在，且包含 photos 字段
  const newPhotos = groupData?.photos || []

  // 判断是否还有更多数据（如果这次获取到的照片数量，小于我们每页期望的数量，
  // 那就说明这已经是最后一页了。）
  const hasMore = newPhotos.length === PHOTOS_PER_PAGE

  // 将照片和"是否还有更多"的标志，一并返回
  return {
    photos: newPhotos,
    hasMore: hasMore,
  }
}

// 获取翻译映射的 Server Action
export async function getTranslationMapAction(
  slug: string,
  lang: Locale,
  type: 'collection' | 'log'
): Promise<Record<string, string>> {
  try {
    const translations = await dal.getTranslationsBySlug({ slug, lang, type })

    // 将翻译数组转换为映射对象
    return translations.reduce((acc, t) => {
      acc[t.language] = t.slug
      return acc
    }, {} as Record<string, string>)
  } catch (error) {
    console.error('Failed to fetch translation map:', error)
    return {}
  }
}

// ================================================= //
//                   点赞相关Actions                  //
// ================================================= //

// 点赞/取消点赞的 Server Action
export async function toggleLikeAction(postId: string) {
  try {
    // 验证用户身份
    const { userId } = await auth()
    if (!userId) {
      return {
        success: false,
        error: '请先登录后再进行点赞操作',
        code: 'UNAUTHORIZED'
      }
    }

    // 基础验证
    if (!postId || typeof postId !== 'string') {
      return {
        success: false,
        error: '无效的帖子ID',
        code: 'INVALID_INPUT'
      }
    }

    // Rate limiting 检查
    const rateLimitResult = await checkRateLimit('like', {
      maxRequests: 30, // 1分钟内最多30次点赞操作
      windowMs: 60000
    })
    
    if (!rateLimitResult.allowed) {
      const resetTimeMinutes = Math.ceil((rateLimitResult.resetTime - Date.now()) / 60000)
      return {
        success: false,
        error: `操作过于频繁，请 ${resetTimeMinutes} 分钟后再试`,
        code: 'RATE_LIMITED'
      }
    }
    
    // 执行点赞/取消点赞操作
    const result = await dal.toggleLikePost(postId)
    
    // 重新验证相关的缓存标签
    revalidateTag(`post-interactions:${postId}`)
    
    return {
      success: true,
      data: result,
      message: result.action === 'liked' ? '点赞成功' : '取消点赞成功'
    }
  } catch (error) {
    console.error('Toggle like action error:', error)
    return {
      success: false,
      error: '操作失败，请稍后重试',
      code: 'INTERNAL_ERROR'
    }
  }
}

// ================================================= //
//                   评论相关Actions                  //
// ================================================= //

// 评论内容验证Schema
const commentContentSchema = z.string()
  .min(1, '评论内容不能为空')
  .max(2000, '评论内容不能超过2000字符')
  .refine(content => content.trim().length > 0, '评论内容不能只包含空格')

// 创建评论的 Server Action
export async function createCommentAction(data: {
  content: string
  postId: string
  parentId?: string
}) {
  try {
    // 验证用户身份
    const { userId } = await auth()
    if (!userId) {
      return {
        success: false,
        error: '请先登录后再发表评论',
        code: 'UNAUTHORIZED'
      }
    }

    // 验证输入数据
     const contentValidation = commentContentSchema.safeParse(data.content)
     if (!contentValidation.success) {
       return {
         success: false,
         error: contentValidation.error.issues[0].message,
         code: 'INVALID_INPUT'
       }
     }

    if (!data.postId || typeof data.postId !== 'string') {
      return {
        success: false,
        error: '无效的文章ID',
        code: 'INVALID_INPUT'
      }
    }

    // Rate limiting 检查
    const rateLimitResult = await checkRateLimit('comment', {
      maxRequests: 10, // 1分钟内最多10条评论
      windowMs: 60000
    })
    
    if (!rateLimitResult.allowed) {
      const resetTimeMinutes = Math.ceil((rateLimitResult.resetTime - Date.now()) / 60000)
      return {
        success: false,
        error: `评论过于频繁，请 ${resetTimeMinutes} 分钟后再试`,
        code: 'RATE_LIMITED'
      }
    }

    // 反垃圾邮件检查
    const spamCheckResult = await checkSpam({
      content: contentValidation.data,
      userId: userId,
      // 在实际应用中，可以从请求头获取真实IP
      ipAddress: undefined
    })
    
    if (spamCheckResult.isSpam) {
      return {
        success: false,
        error: `内容被识别为垃圾信息: ${spamCheckResult.reason}`,
        code: 'SPAM_DETECTED'
      }
    }

    // 准备评论数据
     const commentInput: CreateCommentInput = {
       content: contentValidation.data.trim(),
       postId: data.postId,
       userId: userId,
       parentId: data.parentId || undefined,
       ipAddress: undefined, // 在实际应用中，可以从请求头获取IP
       userAgent: undefined, // 在实际应用中，可以从请求头获取User-Agent
       isAuthorReply: false, // 可以通过检查用户是否为文章作者来设置
     }

    // 创建评论
    const comment = await commentsDal.createComment(commentInput)
    
    // 重新验证相关的缓存标签
    revalidateTag(`post-comments:${data.postId}`)
    revalidateTag(`post-interactions:${data.postId}`)
    
    return {
      success: true,
      data: comment,
      message: data.parentId ? '回复发表成功' : '评论发表成功'
    }
  } catch (error) {
    console.error('Create comment action error:', error)
    return {
      success: false,
      error: '发表评论失败，请稍后重试',
      code: 'INTERNAL_ERROR'
    }
  }
}

// 更新评论的 Server Action
export async function updateCommentAction(commentId: string, data: {
  content?: string
  status?: CommentStatus
}) {
  try {
    // 验证用户身份
    const { userId } = await auth()
    if (!userId) {
      return {
        success: false,
        error: '请先登录',
        code: 'UNAUTHORIZED'
      }
    }

    if (!commentId || typeof commentId !== 'string') {
      return {
        success: false,
        error: '无效的评论ID',
        code: 'INVALID_INPUT'
      }
    }

    // 验证评论内容（如果提供）
     if (data.content !== undefined) {
       const contentValidation = commentContentSchema.safeParse(data.content)
       if (!contentValidation.success) {
         return {
           success: false,
           error: contentValidation.error.issues[0].message,
           code: 'INVALID_INPUT'
         }
       }
     }

    // 获取评论信息以验证权限
    const existingComment = await commentsDal.getCommentById(commentId)
    if (!existingComment) {
      return {
        success: false,
        error: '评论不存在',
        code: 'NOT_FOUND'
      }
    }

    // 检查权限：只有评论作者可以编辑内容，管理员可以修改状态
    if (data.content !== undefined && existingComment.userId !== userId) {
      return {
        success: false,
        error: '您只能编辑自己的评论',
        code: 'FORBIDDEN'
      }
    }

    // 准备更新数据
    const updateInput: UpdateCommentInput = {}
    
    if (data.content !== undefined) {
      updateInput.content = data.content.trim()
    }
    
    if (data.status !== undefined) {
      updateInput.status = data.status
      updateInput.moderatedBy = userId
    }

    // 更新评论
    const updatedComment = await commentsDal.updateComment(commentId, updateInput)
    
    // 重新验证相关的缓存标签
    revalidateTag(`post-comments:${existingComment.postId}`)
    revalidateTag(`post-interactions:${existingComment.postId}`)
    
    return {
      success: true,
      data: updatedComment,
      message: '评论更新成功'
    }
  } catch (error) {
    console.error('Update comment action error:', error)
    return {
      success: false,
      error: '更新评论失败，请稍后重试',
      code: 'INTERNAL_ERROR'
    }
  }
}

// 软删除评论的 Server Action
export async function deleteCommentAction(commentId: string, reason?: string) {
  try {
    // 验证用户身份
    const { userId } = await auth()
    if (!userId) {
      return {
        success: false,
        error: '请先登录',
        code: 'UNAUTHORIZED'
      }
    }

    if (!commentId || typeof commentId !== 'string') {
      return {
        success: false,
        error: '无效的评论ID',
        code: 'INVALID_INPUT'
      }
    }

    // 获取评论信息以验证权限
    const existingComment = await commentsDal.getCommentById(commentId)
    if (!existingComment) {
      return {
        success: false,
        error: '评论不存在',
        code: 'NOT_FOUND'
      }
    }

    // 检查权限：只有评论作者或管理员可以删除
    if (existingComment.userId !== userId) {
      // TODO: 这里可以添加管理员权限检查
      return {
        success: false,
        error: '您只能删除自己的评论',
        code: 'FORBIDDEN'
      }
    }

    // 获取用户信息
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const moderatorName = user.fullName || user.firstName || '用户'

    // 软删除评论
    await commentsDal.softDeleteComment(commentId, userId, moderatorName, reason)
    
    // 重新验证相关的缓存标签
    revalidateTag(`post-comments:${existingComment.postId}`)
    revalidateTag(`post-interactions:${existingComment.postId}`)
    
    return {
      success: true,
      message: '评论删除成功'
    }
  } catch (error) {
    console.error('Delete comment action error:', error)
    return {
      success: false,
      error: '删除评论失败，请稍后重试',
      code: 'INTERNAL_ERROR'
    }
  }
}

// ================================================= //
//                   审核相关Actions                  //
// ================================================= //

// 审核评论的 Server Action（批准）
export async function approveCommentAction(commentId: string, reason?: string) {
  try {
    // 验证用户身份
    const { userId } = await auth()
    if (!userId) {
      return {
        success: false,
        error: '请先登录',
        code: 'UNAUTHORIZED'
      }
    }

    // TODO: 添加管理员权限检查
    // if (!isAdmin(user)) {
    //   return {
    //     success: false,
    //     error: '您没有审核权限',
    //     code: 'FORBIDDEN'
    //   }
    // }

    if (!commentId || typeof commentId !== 'string') {
      return {
        success: false,
        error: '无效的评论ID',
        code: 'INVALID_INPUT'
      }
    }

    // 获取评论信息
    const existingComment = await commentsDal.getCommentById(commentId)
    if (!existingComment) {
      return {
        success: false,
        error: '评论不存在',
        code: 'NOT_FOUND'
      }
    }

    // 获取用户信息
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const moderatorName = user.fullName || user.firstName || '管理员'

    // 审核通过评论
    await commentsDal.approveComment(
      commentId, 
      userId, 
      moderatorName,
      reason || '审核通过'
    )
    
    // 重新验证相关的缓存标签
    revalidateTag(`post-comments:${existingComment.postId}`)
    revalidateTag(`post-interactions:${existingComment.postId}`)
    
    return {
      success: true,
      message: '评论审核通过'
    }
  } catch (error) {
    console.error('Approve comment action error:', error)
    return {
      success: false,
      error: '审核操作失败，请稍后重试',
      code: 'INTERNAL_ERROR'
    }
  }
}

// 拒绝评论的 Server Action
export async function rejectCommentAction(commentId: string, reason?: string) {
  try {
    // 验证用户身份
    const { userId } = await auth()
    if (!userId) {
      return {
        success: false,
        error: '请先登录',
        code: 'UNAUTHORIZED'
      }
    }

    // TODO: 添加管理员权限检查

    if (!commentId || typeof commentId !== 'string') {
      return {
        success: false,
        error: '无效的评论ID',
        code: 'INVALID_INPUT'
      }
    }

    // 获取评论信息
    const existingComment = await commentsDal.getCommentById(commentId)
    if (!existingComment) {
      return {
        success: false,
        error: '评论不存在',
        code: 'NOT_FOUND'
      }
    }

    // 获取用户信息
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const moderatorName = user.fullName || user.firstName || '管理员'

    // 拒绝评论
    await commentsDal.rejectComment(
      commentId, 
      userId, 
      moderatorName,
      reason || '审核不通过'
    )
    
    // 重新验证相关的缓存标签
    revalidateTag(`post-comments:${existingComment.postId}`)
    revalidateTag(`post-interactions:${existingComment.postId}`)
    
    return {
      success: true,
      message: '评论已被拒绝'
    }
  } catch (error) {
    console.error('Reject comment action error:', error)
    return {
      success: false,
      error: '审核操作失败，请稍后重试',
      code: 'INTERNAL_ERROR'
    }
  }
}

// 置顶评论的 Server Action
export async function pinCommentAction(commentId: string) {
  try {
    // 验证用户身份
    const { userId } = await auth()
    if (!userId) {
      return {
        success: false,
        error: '请先登录',
        code: 'UNAUTHORIZED'
      }
    }

    // TODO: 添加管理员权限检查

    if (!commentId || typeof commentId !== 'string') {
      return {
        success: false,
        error: '无效的评论ID',
        code: 'INVALID_INPUT'
      }
    }

    // 获取评论信息
    const existingComment = await commentsDal.getCommentById(commentId)
    if (!existingComment) {
      return {
        success: false,
        error: '评论不存在',
        code: 'NOT_FOUND'
      }
    }

    // 置顶评论
    await commentsDal.pinComment(commentId, userId)
    
    // 重新验证相关的缓存标签
    revalidateTag(`post-comments:${existingComment.postId}`)
    revalidateTag(`post-interactions:${existingComment.postId}`)
    
    return {
      success: true,
      message: '评论置顶成功'
    }
  } catch (error) {
    console.error('Pin comment action error:', error)
    return {
      success: false,
      error: '置顶操作失败，请稍后重试',
      code: 'INTERNAL_ERROR'
    }
  }
}

// 取消置顶评论的 Server Action
export async function unpinCommentAction(commentId: string) {
  try {
    // 验证用户身份
    const { userId } = await auth()
    if (!userId) {
      return {
        success: false,
        error: '请先登录',
        code: 'UNAUTHORIZED'
      }
    }

    // TODO: 添加管理员权限检查

    if (!commentId || typeof commentId !== 'string') {
      return {
        success: false,
        error: '无效的评论ID',
        code: 'INVALID_INPUT'
      }
    }

    // 获取评论信息
    const existingComment = await commentsDal.getCommentById(commentId)
    if (!existingComment) {
      return {
        success: false,
        error: '评论不存在',
        code: 'NOT_FOUND'
      }
    }

    // 取消置顶评论
    await commentsDal.unpinComment(commentId)
    
    // 重新验证相关的缓存标签
    revalidateTag(`post-comments:${existingComment.postId}`)
    revalidateTag(`post-interactions:${existingComment.postId}`)
    
    return {
      success: true,
      message: '取消置顶成功'
    }
  } catch (error) {
    console.error('Unpin comment action error:', error)
    return {
      success: false,
      error: '取消置顶操作失败，请稍后重试',
      code: 'INTERNAL_ERROR'
    }
  }
}

// ================================================= //
//                   兼容性Actions                   //
// ================================================= //

// 保留旧的评论Action以保持向后兼容
const oldCommentSchema = z.string().min(1, 'Comment cannot be empty.').max(500)

export async function commentAction(postId: string, formData: FormData) {
  const content = formData.get('comment') as string

  // Zod 校验
  const validation = oldCommentSchema.safeParse(content)
  if (!validation.success) {
    return { error: validation.error.format()._errors.join(',') }
  }

  try {
    // 调用新的创建评论Action
    const result = await createCommentAction({
      content: validation.data,
      postId: postId
    })

    if (result.success) {
      return { success: true }
    } else {
      return { error: result.error }
    }
  } catch (error) {
    console.error('Failed to create comment:', error)
    return { error: 'Failed to create comment.' }
  }
}

// ================================================= //
//                   公开评论获取Actions               //
// ================================================= //

// 获取评论列表的 Server Action（替代 /api/comments）
export async function getCommentsAction({
  postId,
  page = 1,
  limit = 10,
  status = CommentStatus.APPROVED
}: {
  postId: string
  page?: number
  limit?: number
  status?: CommentStatus
}) {
  try {
    // 验证输入参数
    if (!postId || typeof postId !== 'string') {
      return {
        success: false,
        error: 'postId is required',
        code: 'INVALID_INPUT'
      }
    }

    // 计算偏移量
    const offset = (page - 1) * limit

    // 获取评论数据
    const comments = await commentsDal.getComments({
      postId,
      status,
      limit,
      offset,
      includeReplies: true,
      includeDeleted: false,
      orderBy: 'pinned' // 使用 pinned 排序，置顶评论优先
    })

    return {
      success: true,
      data: {
        comments,
        page,
        limit,
        hasMore: comments.length === limit
      }
    }

  } catch (error) {
    console.error('Error fetching comments:', error)
    return {
      success: false,
      error: 'Failed to fetch comments',
      code: 'INTERNAL_ERROR'
    }
  }
}

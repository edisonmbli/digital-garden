// lib/dal-comments.ts
import { cache } from 'react'
import prisma from '@/lib/prisma'
import { 
  CommentDTO, 
  CommentQueryOptions, 
  CreateCommentInput, 
  UpdateCommentInput, 
  CommentStats,
  ModerationLogDTO,
  SpamDetectionLogDTO,
  CommentStatus
} from '@/types'
import type { Prisma } from '@prisma/client'

// 管理后台评论类型
interface AdminComment {
  id: string
  content: string
  status: CommentStatus
  isPinned: boolean
  isDeleted: boolean
  isAuthorReply: boolean
  parentId: string | null
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string | null
    email: string | null
    avatarUrl: string | null
  }
  post: {
    id: string
    contentType: string
    sanityDocumentId: string | null
    photo: {
      titleJson: string | null
      sanityAssetId: string | null
    } | null
    logs: {
      title: string
      slug: string
      language: string
    }[]
  }
  _count: {
    replies: number
  }
  replies?: Array<{
    id: string
    content: string
    status: CommentStatus
    isPinned: boolean
    isDeleted: boolean
    isAuthorReply: boolean
    parentId: string | null
    createdAt: Date
    updatedAt: Date
    user: {
      id: string
      name: string | null
      email: string | null
      avatarUrl: string | null
    }
  }>
}

// ================================================= //
//                评论查询函数                       //
// ================================================= //

/**
 * 获取评论列表（完整版本，支持所有新字段）
 */
export const getComments = cache(async (options: CommentQueryOptions): Promise<CommentDTO[]> => {
  const { 
    postId, 
    includeReplies = true, 
    includeDeleted = false,
    status,
    limit = 20, 
    offset = 0, 
    orderBy = 'newest' 
  } = options

  // 构建状态过滤条件
  const statusFilter = status 
    ? Array.isArray(status) 
      ? { in: status.map(s => s as CommentStatus) }
      : status as CommentStatus
    : undefined

  // 构建排序条件
  const orderByClause = (() => {
    switch (orderBy) {
      case 'oldest':
        return [{ createdAt: 'asc' as const }]
      case 'pinned':
        return [
          { isPinned: 'desc' as const },
          { createdAt: 'desc' as const }
        ]
      default:
        return [{ createdAt: 'desc' as const }]
    }
  })()

  const comments = await prisma.comment.findMany({
    where: {
      postId,
      parentId: includeReplies ? null : undefined,
      isDeleted: includeDeleted ? undefined : false,
      status: statusFilter,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      replies: includeReplies ? {
        where: {
          isDeleted: includeDeleted ? undefined : false,
          status: statusFilter,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      } : false,
      _count: {
        select: {
          replies: true,
        },
      },
    },
    orderBy: orderByClause,
    take: limit,
    skip: offset,
  })

  // 转换为 CommentDTO 格式，确保 replies 字段正确
  return comments as unknown as CommentDTO[]
})

/**
 * 根据ID获取单个评论
 */
export const getCommentById = cache(async (id: string): Promise<CommentDTO | null> => {
  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      replies: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      _count: {
        select: {
          replies: true,
        },
      },
    },
  })

  return comment as CommentDTO | null
})

/**
 * 获取评论统计信息
 */
export const getCommentStats = cache(async (postId: string): Promise<CommentStats> => {
  const [total, approved, pending, rejected, deleted, pinned] = await Promise.all([
    prisma.comment.count({ where: { postId } }),
    prisma.comment.count({ where: { postId, status: CommentStatus.APPROVED } }),
    prisma.comment.count({ where: { postId, status: CommentStatus.PENDING } }),
    prisma.comment.count({ where: { postId, status: CommentStatus.REJECTED } }),
    prisma.comment.count({ where: { postId, isDeleted: true } }),
    prisma.comment.count({ where: { postId, isPinned: true } }),
  ])

  return {
    total,
    approved,
    pending,
    rejected,
    deleted,
    pinned,
  }
})

// ================================================= //
//                评论创建和更新函数                  //
// ================================================= //

/**
 * 创建作者回复
 */
export async function createAuthorReply(data: {
  content: string
  postId: string
  userId: string
  parentId: string
}): Promise<CommentDTO> {
  const comment = await prisma.comment.create({
    data: {
      content: data.content,
      postId: data.postId,
      userId: data.userId,
      parentId: data.parentId,
      isAuthorReply: true,
      status: CommentStatus.APPROVED, // 作者回复自动审核通过
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          replies: true,
        },
      },
    },
  })

  return {
    id: comment.id,
    content: comment.content,
    postId: comment.postId,
    userId: comment.userId,
    parentId: comment.parentId,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    deletedAt: comment.deletedAt,
    ipAddress: comment.ipAddress,
    isDeleted: comment.isDeleted,
    isPinned: comment.isPinned,
    userAgent: comment.userAgent,
    deletedBy: comment.deletedBy,
    isAuthorReply: comment.isAuthorReply,
    moderatedAt: comment.moderatedAt,
    moderatedBy: comment.moderatedBy,
    pinnedAt: comment.pinnedAt,
    pinnedBy: comment.pinnedBy,
    status: comment.status,
    user: comment.user,
    _count: comment._count,
  }
}
export async function createComment(data: CreateCommentInput): Promise<CommentDTO> {
  const { 
    content, 
    postId, 
    userId, 
    parentId, 
    ipAddress, 
    userAgent, 
    isAuthorReply = false 
  } = data

  // 内容验证
  if (!content.trim() || content.length > 2000) {
    throw new Error('评论内容不能为空且不能超过2000字符')
  }

  // 验证文章是否存在
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true }
  })
  
  if (!post) {
    throw new Error('文章不存在')
  }

  // 检查父评论是否存在
  if (parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { id: true, postId: true }
    })
    
    if (!parentComment) {
      throw new Error('父评论不存在')
    }
    
    if (parentComment.postId !== postId) {
      throw new Error('父评论与当前文章不匹配')
    }
  }

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      postId,
      userId,
      parentId,
      ipAddress,
      userAgent,
      isAuthorReply,
      status: CommentStatus.PENDING, // 默认待审核
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          replies: true,
        },
      },
    },
  })

  return comment as CommentDTO
}

/**
 * 更新评论
 */
export async function updateComment(id: string, data: UpdateCommentInput): Promise<CommentDTO> {
  const updateData: {
    content?: string
    updatedAt?: Date
    status?: CommentStatus
    moderatedAt?: Date | null
    moderatedBy?: string | null
    isPinned?: boolean
    pinnedAt?: Date | null
    pinnedBy?: string | null
    isDeleted?: boolean
    deletedAt?: Date | null
    deletedBy?: string | null
  } = {}

  // 构建更新数据
  if (data.content !== undefined) {
    if (!data.content.trim() || data.content.length > 2000) {
      throw new Error('评论内容不能为空且不能超过2000字符')
    }
    updateData.content = data.content.trim()
    updateData.updatedAt = new Date()
  }

  if (data.status !== undefined) {
    updateData.status = data.status
    updateData.moderatedAt = new Date()
    updateData.moderatedBy = data.moderatedBy
  }

  if (data.isPinned !== undefined) {
    updateData.isPinned = data.isPinned
    if (data.isPinned) {
      updateData.pinnedAt = new Date()
      updateData.pinnedBy = data.pinnedBy
    } else {
      updateData.pinnedAt = null
      updateData.pinnedBy = null
    }
  }

  if (data.isDeleted !== undefined) {
    updateData.isDeleted = data.isDeleted
    if (data.isDeleted) {
      updateData.deletedAt = new Date()
      updateData.deletedBy = data.deletedBy
    } else {
      updateData.deletedAt = null
      updateData.deletedBy = null
    }
  }

  const comment = await prisma.comment.update({
    where: { id },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          replies: true,
        },
      },
    },
  })

  return comment as CommentDTO
}

/**
 * 软删除评论
 */
export async function softDeleteComment(
  id: string, 
  deletedBy: string, 
  moderatorName?: string,
  reason?: string
): Promise<CommentDTO> {
  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { content: true }
  })

  if (!comment) {
    throw new Error('评论不存在')
  }

  // 使用事务确保数据一致性
  const [updatedComment] = await prisma.$transaction([
    prisma.comment.update({
      where: { id },
      data: {
        status: CommentStatus.DELETED,
        isDeleted: true,
        deletedBy,
        deletedAt: new Date(),
        deletedReason: reason,
        moderatedAt: new Date(),
        moderatedBy: deletedBy,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    }),
    prisma.commentModerationLog.create({
      data: {
        commentId: id,
        moderatorId: deletedBy,
        moderatorName,
        reason,
        action: 'DELETED',
        contentSnapshot: comment.content,
      },
    }),
  ])

  return updatedComment as CommentDTO
}

/**
 * 恢复已删除的评论
 */
export async function restoreComment(id: string): Promise<CommentDTO> {
  return updateComment(id, {
    isDeleted: false,
    deletedBy: undefined,
  })
}

/**
 * 置顶评论
 */
export async function pinComment(id: string, pinnedBy: string): Promise<CommentDTO> {
  return updateComment(id, {
    isPinned: true,
    pinnedBy,
  })
}

/**
 * 取消置顶评论
 */
export async function unpinComment(id: string): Promise<CommentDTO> {
  return updateComment(id, {
    isPinned: false,
    pinnedBy: undefined,
  })
}

// ================================================= //
//                评论审核函数                       //
// ================================================= //

/**
 * 批准评论
 */
export async function approveComment(
  id: string, 
  moderatorId: string, 
  moderatorName?: string,
  reason?: string
): Promise<CommentDTO> {
  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { content: true }
  })

  if (!comment) {
    throw new Error('评论不存在')
  }

  // 使用事务确保数据一致性
  const [updatedComment] = await prisma.$transaction([
    prisma.comment.update({
      where: { id },
      data: {
        status: CommentStatus.APPROVED,
        moderatedAt: new Date(),
        moderatedBy: moderatorId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    }),
    prisma.commentModerationLog.create({
      data: {
        commentId: id,
        moderatorId,
        moderatorName,
        reason,
        action: 'APPROVED',
        contentSnapshot: comment.content,
      },
    }),
  ])

  return updatedComment as CommentDTO
}

/**
 * 拒绝评论
 */
export async function rejectComment(
  id: string, 
  moderatorId: string, 
  moderatorName?: string,
  reason?: string
): Promise<CommentDTO> {
  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { content: true }
  })

  if (!comment) {
    throw new Error('评论不存在')
  }

  const [updatedComment] = await prisma.$transaction([
    prisma.comment.update({
      where: { id },
      data: {
        status: CommentStatus.REJECTED,
        moderatedAt: new Date(),
        moderatedBy: moderatorId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    }),
    prisma.commentModerationLog.create({
      data: {
        commentId: id,
        moderatorId,
        moderatorName,
        reason,
        action: 'REJECTED',
        contentSnapshot: comment.content,
      },
    }),
  ])

  return updatedComment as CommentDTO
}

/**
 * 批量审核评论
 */
export async function batchModerateComments(
  commentIds: string[],
  action: CommentStatus,
  moderatorId: string,
  moderatorName?: string,
  reason?: string
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (const id of commentIds) {
    try {
      if (action === CommentStatus.APPROVED) {
        await approveComment(id, moderatorId, moderatorName, reason)
      } else if (action === CommentStatus.REJECTED) {
        await rejectComment(id, moderatorId, moderatorName, reason)
      }
      success++
    } catch (error) {
      console.error(`Failed to moderate comment ${id}:`, error)
      failed++
    }
  }

  return { success, failed }
}

// ================================================= //
//                审核日志函数                       //
// ================================================= //

/**
 * 获取评论的审核日志
 */
export const getModerationLogs = cache(async (commentId: string): Promise<ModerationLogDTO[]> => {
  const logs = await prisma.commentModerationLog.findMany({
    where: { commentId },
    orderBy: { createdAt: 'desc' },
  })

  return logs as ModerationLogDTO[]
})

/**
 * 获取审核员的操作日志
 */
export const getModeratorLogs = cache(async (
  moderatorId: string,
  limit = 50,
  offset = 0
): Promise<ModerationLogDTO[]> => {
  const logs = await prisma.commentModerationLog.findMany({
    where: { moderatorId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  return logs as ModerationLogDTO[]
})

// ================================================= //
//                垃圾检测函数                       //
// ================================================= //

/**
 * 记录垃圾检测日志
 */
export async function logSpamDetection(data: {
  ipAddress?: string
  userId?: string
  content: string
  confidence?: number
  isSpam: boolean
  reason?: string
  triggerRules: string[]
  userAgent?: string
}): Promise<SpamDetectionLogDTO> {
  const log = await prisma.spamDetectionLog.create({
    data,
  })

  return log as SpamDetectionLogDTO
}

/**
 * 获取垃圾检测日志
 */
export const getSpamDetectionLogs = cache(async (
  filters: {
    ipAddress?: string
    userId?: string
    isSpam?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<SpamDetectionLogDTO[]> => {
  const { ipAddress, userId, isSpam, limit = 50, offset = 0 } = filters

  const logs = await prisma.spamDetectionLog.findMany({
    where: {
      ipAddress,
      userId,
      isSpam,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  return logs as SpamDetectionLogDTO[]
})

// ================================================= //
//                管理后台专用函数                   //
// ================================================= //

/**
 * 获取全站评论统计信息（管理后台用）
 */
export const getGlobalCommentStats = cache(async (): Promise<CommentStats> => {
  const [total, approved, pending, rejected, deleted, pinned] = await Promise.all([
    prisma.comment.count(),
    prisma.comment.count({ where: { status: CommentStatus.APPROVED } }),
    prisma.comment.count({ where: { status: CommentStatus.PENDING } }),
    prisma.comment.count({ where: { status: CommentStatus.REJECTED } }),
    prisma.comment.count({ where: { isDeleted: true } }),
    prisma.comment.count({ where: { isPinned: true } }),
  ])

  return {
    total,
    approved,
    pending,
    rejected,
    deleted,
    pinned,
  }
})

/**
 * 获取管理后台评论列表（支持复杂过滤和搜索）
 */
export const getCommentsForAdmin = cache(async (options: {
  contentType?: 'photo' | 'log'
  status?: CommentStatus | 'all'
  search?: string
  page?: number
  limit?: number
  sortBy?: 'newest' | 'oldest' | 'status' | 'pinned'
}): Promise<{
  comments: AdminComment[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}> => {
  const {
    contentType,
    status = 'all',
    search = '',
    page = 1,
    limit = 20,
    sortBy = 'newest'
  } = options

  // 构建 where 条件
  const where: Prisma.CommentWhereInput = {}

  // 内容类型过滤
  if (contentType) {
    where.post = {
      contentType
    }
  }

  // 状态过滤
  if (status !== 'all') {
    where.status = status
  }

  // 删除状态过滤
  // 当状态为 'all' 时，显示所有评论包括已删除的
  // 当状态为 'DELETED' 时，只显示已删除的评论
  // 当状态为其他特定状态时，只显示未删除的评论
  if (status === 'all') {
    // 显示所有评论，包括已删除的
  } else if (status === CommentStatus.DELETED) {
    // 只显示已删除的评论
    where.isDeleted = true
  } else {
    // 显示未删除的评论
    where.isDeleted = false
  }

  // 搜索过滤
  if (search.trim()) {
    where.OR = [
      { content: { contains: search.trim(), mode: 'insensitive' } },
      { user: { name: { contains: search.trim(), mode: 'insensitive' } } },
      { user: { email: { contains: search.trim(), mode: 'insensitive' } } }
    ]
  }

  // 构建排序条件
  const orderBy: Prisma.CommentOrderByWithRelationInput[] = (() => {
    switch (sortBy) {
      case 'oldest':
        return [{ createdAt: 'asc' }]
      case 'status':
        return [
          { status: 'asc' },
          { createdAt: 'desc' }
        ]
      case 'pinned':
        return [
          { isPinned: 'desc' },
          { createdAt: 'desc' }
        ]
      default:
        return [{ createdAt: 'desc' }]
    }
  })()

  // 计算分页
  const skip = (page - 1) * limit

  // 执行查询
  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            contentType: true,
            sanityDocumentId: true,
            photo: {
              select: {
                titleJson: true,
                sanityAssetId: true,
              },
            },
            logs: {
              select: {
                title: true,
                slug: true,
                language: true,
              },
            },
          },
        },
        replies: {
          where: {
            isDeleted: false,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
      orderBy,
      take: limit,
      skip,
    }),
    prisma.comment.count({ where })
  ])

  const totalPages = Math.ceil(total / limit)

  return {
    comments: comments as AdminComment[],
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  }
})

/**
 * 批量更新评论状态（管理后台用）
 */
export async function batchUpdateComments(
  commentIds: string[],
  action: 'approve' | 'reject' | 'delete' | 'pin' | 'unpin',
  moderatorId: string,
  moderatorName?: string,
  reason?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0
  let failed = 0
  const errors: string[] = []

  for (const id of commentIds) {
    try {
      switch (action) {
        case 'approve':
          await approveComment(id, moderatorId, moderatorName, reason)
          break
        case 'reject':
          await rejectComment(id, moderatorId, moderatorName, reason)
          break
        case 'delete':
          await softDeleteComment(id, moderatorId, moderatorName, reason)
          break
        case 'pin':
          await pinComment(id, moderatorId)
          break
        case 'unpin':
          await unpinComment(id)
          break
        default:
          throw new Error(`未知操作: ${action}`)
      }
      success++
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      console.error(`Failed to ${action} comment ${id}:`, error)
      errors.push(`评论 ${id}: ${errorMessage}`)
      failed++
    }
  }

  return { success, failed, errors }
}

/**
 * 获取评论详情（管理后台用，包含完整信息）
 */
export const getCommentForAdmin = cache(async (id: string): Promise<AdminComment | null> => {
  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          createdAt: true,
        },
      },
      post: {
        select: {
          id: true,
          contentType: true,
          sanityDocumentId: true,
          photo: {
            select: {
              titleJson: true,
              sanityAssetId: true,
            },
          },
          logs: {
            select: {
              title: true,
              slug: true,
              language: true,
            },
          },
        },
      },
      replies: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      _count: {
        select: {
          replies: true,
        },
      },
    },
  })

  return comment as AdminComment | null
})

/**
 * 获取用户的评论历史（管理后台用）
 */
export const getUserComments = cache(async (
  userId: string,
  options: {
    limit?: number
    offset?: number
    includeDeleted?: boolean
  } = {}
): Promise<AdminComment[]> => {
  const { limit = 20, offset = 0, includeDeleted = false } = options

  const comments = await prisma.comment.findMany({
    where: {
      userId,
      isDeleted: includeDeleted ? undefined : false,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      post: {
        select: {
          id: true,
          contentType: true,
          sanityDocumentId: true,
          photo: {
            select: {
              titleJson: true,
              sanityAssetId: true,
            },
          },
          logs: {
            select: {
              title: true,
              slug: true,
              language: true,
            },
          },
        },
      },
      _count: {
        select: {
          replies: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  return comments as AdminComment[]
})

/**
 * 获取最近的审核活动（管理后台用）
 */
export const getRecentModerationActivity = cache(async (
  limit = 50
): Promise<ModerationLogDTO[]> => {
  const logs = await prisma.commentModerationLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      comment: {
        select: {
          id: true,
          content: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  })

  return logs as ModerationLogDTO[]
})

// ================================================= //
//                测试和调试函数                     //
// ================================================= //

/**
 * 测试所有新字段的访问
 */
export async function testAllFields() {
  try {
    const comment = await prisma.comment.findFirst({
      select: {
        id: true,
        content: true,
        postId: true,
        userId: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        ipAddress: true,
        isDeleted: true,
        isPinned: true,
        userAgent: true,
        deletedBy: true,
        isAuthorReply: true,
        moderatedAt: true,
        moderatedBy: true,
        pinnedAt: true,
        pinnedBy: true,
        status: true,
      },
    })
    
    return { success: true, comment }
  } catch (error) {
    console.error('All fields test failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * 测试数据库连接和基础查询
 */
export async function testDatabaseConnection() {
  try {
    const count = await prisma.comment.count()
    return { success: true, count }
  } catch (error) {
    console.error('Database connection test failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

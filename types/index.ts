export type NavItem = {
  label: string
  href: string
  disabled?: boolean
}

// ================================================= //
//                评论系统类型定义                    //
// ================================================= //

// 评论状态枚举
export enum CommentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DELETED = 'DELETED',
}

// 基础评论DTO（用于客户端传输）
export interface CommentDTO {
  id: string
  content: string
  postId: string
  userId: string
  parentId: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  ipAddress: string | null
  isDeleted: boolean
  isPinned: boolean
  userAgent: string | null
  deletedBy: string | null
  isAuthorReply: boolean
  moderatedAt: Date | null
  moderatedBy: string | null
  pinnedAt: Date | null
  pinnedBy: string | null
  status: CommentStatus
  user: {
    id: string
    name: string | null
    avatarUrl: string | null
  }
  replies?: CommentDTO[]
  _count?: {
    replies: number
  }
}

// 创建评论的输入类型
export interface CreateCommentInput {
  content: string
  postId: string
  userId: string
  parentId?: string
  ipAddress?: string
  userAgent?: string
  isAuthorReply?: boolean
}

// 更新评论的输入类型
export interface UpdateCommentInput {
  content?: string
  status?: CommentStatus
  isPinned?: boolean
  isDeleted?: boolean
  moderatedBy?: string
  pinnedBy?: string
  deletedBy?: string
}

// 评论查询选项
export interface CommentQueryOptions {
  postId: string
  includeReplies?: boolean
  includeDeleted?: boolean
  status?: CommentStatus | CommentStatus[]
  limit?: number
  offset?: number
  orderBy?: 'newest' | 'oldest' | 'pinned'
}

// 评论统计信息
export interface CommentStats {
  total: number
  approved: number
  pending: number
  rejected: number
  deleted: number
  pinned: number
}

// 审核日志DTO
export interface ModerationLogDTO {
  id: string
  commentId: string
  moderatorId: string
  createdAt: Date
  contentSnapshot: string
  moderatorName: string | null
  reason: string | null
  action: CommentStatus
}

// 垃圾检测日志DTO
export interface SpamDetectionLogDTO {
  id: string
  ipAddress: string | null
  userId: string | null
  content: string
  createdAt: Date
  confidence: number | null
  isSpam: boolean
  reason: string | null
  triggerRules: string[]
  userAgent: string | null
}

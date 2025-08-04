// app/ui/comment-item.tsx
'use client'

import { CommentDTO } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Pin, Shield, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useI18n } from '@/app/context/i18n-provider'

interface CommentItemProps {
  comment: CommentDTO
  postId: string
  onUpdate?: (comment: CommentDTO) => void
  onReply?: (comment: CommentDTO) => void
  isReply?: boolean
}

export function CommentItem({
  comment,
  postId,
  onUpdate,
  onReply,
  isReply = false,
}: CommentItemProps) {
  const dict = useI18n()

  // 格式化时间
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
  })

  // 获取用户名首字母
  const getUserInitials = (name: string | null) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // 获取显示名称
  const getDisplayName = (name: string | null) => {
    return name || dict.comments?.anonymousUser || '匿名用户'
  }

  return (
    <div className={`group ${isReply ? 'ml-4 md:ml-6' : ''}`}>
      <div className="flex space-x-3">
        {/* 用户头像 - 缩小尺寸 */}
        <Avatar className="h-6 w-6 md:h-7 md:w-7 flex-shrink-0">
          <AvatarImage src={comment.user.avatarUrl || undefined} />
          <AvatarFallback className="text-xs">
            {getUserInitials(comment.user.name)}
          </AvatarFallback>
        </Avatar>

        {/* 评论内容区域 */}
        <div className="flex-1 min-w-0">
          {/* 评论头部 - 增加用户名和时间的间距 */}
          <div className="flex items-center space-x-4 mb-1.5">
            <span className="font-medium text-sm text-foreground">
              {getDisplayName(comment.user.name)}
            </span>

            {/* 作者回复标识 - 浅蓝色背景 */}
            {comment.isAuthorReply && (
              <Badge
                variant="secondary"
                className="text-xs bg-blue-200/50 text-blue-400 dark:bg-blue-400/70 dark:text-blue-100/90"
              >
                <Shield className="mr-1 h-3 w-3" />
                {dict.comments?.authorReply || '作者'}
              </Badge>
            )}

            {/* 置顶标识 */}
            {comment.isPinned && (
              <Badge variant="outline" className="text-xs">
                <Pin className="mr-1 h-3 w-3" />
                {dict.comments?.pinned || '置顶'}
              </Badge>
            )}

            <span className="text-xs text-muted-foreground flex items-center">
              <Clock className="mr-1 h-3 w-3" />
              {timeAgo}
            </span>
          </div>

          {/* 评论内容 - 减少作者回复的缩进 */}
          <div
            className={`prose prose-sm max-w-none ${
              comment.isAuthorReply
                ? 'pl-2 border-l-2 border-blue-300 dark:border-blue-600'
                : ''
            }`}
          >
            <p className="text-sm text-gray-500 text-foreground leading-relaxed whitespace-pre-wrap mb-0">
              {comment.content}
            </p>
          </div>

          {/* 子回复列表 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2 space-y-2">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  onUpdate={onUpdate}
                  onReply={onReply}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

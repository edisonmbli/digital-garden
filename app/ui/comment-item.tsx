// app/ui/comment-item.tsx
'use client'

import { useState } from 'react'
import { CommentDTO } from '@/types'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Pin, 
  Reply, 
  MoreHorizontal, 
  Shield,
  Clock
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { useI18n } from '@/app/context/i18n-provider'
import CommentForm from './comment-form'

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
  isReply = false 
}: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  const dict = useI18n()

  // 处理回复提交
  const handleReplySubmit = async (content: string) => {
    setIsReplying(true)
    try {
      // 这里调用回复API
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          postId,
          parentId: comment.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create reply')
      }

      const newReply = await response.json()
      onReply?.(newReply)
      setShowReplyForm(false)
    } catch (error) {
      console.error('Error creating reply:', error)
    } finally {
      setIsReplying(false)
    }
  }

  // 格式化时间
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { 
    addSuffix: true 
  })

  // 获取用户名首字母
  const getUserInitials = (name: string | null) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className={`group ${isReply ? 'ml-8 md:ml-12' : ''}`}>
      <div className="flex space-x-3">
        {/* 用户头像 */}
        <Avatar className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0">
          <AvatarImage src={comment.user.avatarUrl || undefined} />
          <AvatarFallback className="text-xs md:text-sm">
            {getUserInitials(comment.user.name)}
          </AvatarFallback>
        </Avatar>

        {/* 评论内容区域 */}
        <div className="flex-1 min-w-0">
          {/* 评论头部 */}
          <div className="flex items-center space-x-2 mb-2">
            <span className="font-medium text-sm md:text-base text-foreground">
              {comment.user.name || 'Anonymous User'}
            </span>
            
            {/* 作者回复标识 */}
            {comment.isAuthorReply && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="mr-1 h-3 w-3" />
                {dict.comments?.authorReply || 'Author'}
              </Badge>
            )}
            
            {/* 置顶标识 */}
            {comment.isPinned && (
              <Badge variant="outline" className="text-xs">
                <Pin className="mr-1 h-3 w-3" />
                {dict.comments?.pinned || 'Pinned'}
              </Badge>
            )}

            <span className="text-xs md:text-sm text-muted-foreground flex items-center">
              <Clock className="mr-1 h-3 w-3" />
              {timeAgo}
            </span>

            {/* 更多操作菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  {dict.comments?.moreActions || 'Report'}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Copy Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 评论内容 */}
          <div className={`prose prose-sm max-w-none mb-3 ${
            comment.isAuthorReply 
              ? 'bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border-l-4 border-blue-500' 
              : ''
          }`}>
            <p className="text-sm md:text-base text-foreground leading-relaxed whitespace-pre-wrap">
              {comment.content}
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center space-x-4">
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="text-xs md:text-sm h-8 px-2"
              >
                <Reply className="mr-1 h-3 w-3" />
                {dict.comments?.reply || 'Reply'}
              </Button>
            )}
          </div>

          {/* 回复表单 */}
          {showReplyForm && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <CommentForm
                postId={postId}
                parentId={comment.id}
                placeholder={dict.comments?.replyTo || 'Write a reply...'}
                onSubmit={handleReplySubmit}
                isSubmitting={isReplying}
                compact
              />
            </div>
          )}

          {/* 子回复列表 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
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
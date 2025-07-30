// app/ui/comment-list.tsx
'use client'

import { useState, useCallback } from 'react'
import { CommentDTO, CommentStatus } from '@/types'
import { CommentItem } from './comment-item'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useI18n } from '@/app/context/i18n-provider'

interface CommentListProps {
  postId: string
  initialComments?: CommentDTO[]
  initialTotal?: number
  pageSize?: number
  className?: string
}

export function CommentList({ 
  postId, 
  initialComments = [], 
  initialTotal = 0,
  pageSize = 10,
  className = '' 
}: CommentListProps) {
  const [comments, setComments] = useState<CommentDTO[]>(initialComments)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialTotal > initialComments.length)
  const [page, setPage] = useState(1)
  const dict = useI18n()

  // 加载更多评论
  const loadMoreComments = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    try {
      const response = await fetch(`/api/comments?postId=${postId}&page=${page + 1}&limit=${pageSize}&status=${CommentStatus.APPROVED}`)
      
      if (!response.ok) {
        throw new Error('Failed to load comments')
      }

      const data = await response.json()
      const newComments = data.comments || []
      
      setComments(prev => [...prev, ...newComments])
      setPage(prev => prev + 1)
      setHasMore(newComments.length === pageSize)
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }, [postId, page, pageSize, loading, hasMore])

  // 处理评论更新（如点赞、回复等）
  const handleCommentUpdate = useCallback((updatedComment: CommentDTO) => {
    setComments(prev => 
      prev.map(comment => 
        comment.id === updatedComment.id ? updatedComment : comment
      )
    )
  }, [])

  // 处理新评论添加
  const handleCommentAdd = useCallback((newComment: CommentDTO) => {
    setComments(prev => [newComment, ...prev])
  }, [])

  // 按置顶状态和时间排序
  const sortedComments = comments.sort((a, b) => {
    // 置顶评论优先
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    
    // 时间倒序（最新的在前）
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  if (comments.length === 0 && !loading) {
    return null
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 评论列表 */}
      <div className="space-y-4">
        {sortedComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            postId={postId}
            onUpdate={handleCommentUpdate}
            onReply={handleCommentAdd}
          />
        ))}
      </div>

      {/* 加载更多按钮 */}
      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button
            variant="outline"
            onClick={loadMoreComments}
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {dict.common?.loading || 'Loading...'}
              </>
            ) : (
              dict.comments?.loadMore || 'Load More'
            )}
          </Button>
        </div>
      )}

      {/* 加载状态 */}
      {loading && comments.length === 0 && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
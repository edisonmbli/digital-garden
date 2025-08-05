// app/ui/comment-list.tsx
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { CommentDTO, CommentStatus } from '@/types'
import { CommentItem } from './comment-item'
import { Loader2 } from 'lucide-react'
import { useI18n } from '@/app/context/i18n-provider'
import { getCommentsAction } from '@/lib/actions'

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
  const [initialized, setInitialized] = useState(initialComments.length > 0)
  const dict = useI18n()
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef<HTMLDivElement | null>(null)

  // 获取评论数据的通用函数
  const fetchComments = useCallback(async (pageNum: number, append: boolean = false) => {
    if (loading) return

    setLoading(true)
    try {
      const result = await getCommentsAction({
        postId,
        page: pageNum,
        limit: pageSize,
        status: CommentStatus.APPROVED
      })
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load comments')
      }

      const newComments = result.data.comments || []
      
      if (append) {
        setComments(prev => [...prev, ...newComments])
      } else {
        setComments(newComments)
      }
      
      setPage(pageNum)
      setHasMore(result.data.hasMore)
      setInitialized(true)
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }, [postId, pageSize, loading])

  // 初始化时获取评论数据
  useEffect(() => {
    if (!initialized && postId) {
      fetchComments(1, false)
    }
  }, [postId, initialized, fetchComments])

  // 加载更多评论
  const loadMoreComments = useCallback(async () => {
    if (loading || !hasMore) return
    await fetchComments(page + 1, true)
  }, [page, loading, hasMore, fetchComments])

  // 设置无限滚动观察器
  useEffect(() => {
    if (!hasMore || loading) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting) {
          loadMoreComments()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    )

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loading, loadMoreComments])

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
  const sortedComments = [...comments].sort((a, b) => {
    // 置顶评论优先
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    
    // 时间倒序（最新的在前）
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  // 加载状态
  if (loading && comments.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // 没有评论时不显示任何内容
  if (comments.length === 0 && initialized) {
    return null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 评论列表 - 减小间距 */}
      <div className="space-y-6">
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

      {/* 无限滚动加载指示器 */}
      {hasMore && (
        <div 
          ref={loadingRef}
          className="flex justify-center py-4"
        >
          {loading && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-body-sm">{dict.common?.loading || 'Loading...'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
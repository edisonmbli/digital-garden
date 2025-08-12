// app/ui/comment-form.tsx
'use client'

import { useState, useTransition } from 'react'
import { createCommentAction } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Send } from 'lucide-react'
import { useI18n } from '@/app/context/i18n-provider'
import { useAuth } from '@clerk/nextjs'
import { analytics } from '@/lib/analytics-logger'
import { withComponentMonitoring } from '@/lib/sentry-client-integration'

interface CommentFormProps {
  postId: string
  parentId?: string
  placeholder?: string
  onSubmit?: (content: string) => Promise<void>
  onSubmitSuccess?: () => void
  onAuthRequired?: () => void
  isSubmitting?: boolean
  compact?: boolean
  className?: string
}

function CommentFormComponent({ 
  postId, 
  parentId, 
  placeholder, 
  onSubmit, 
  onSubmitSuccess,
  onAuthRequired,
  isSubmitting: externalIsSubmitting = false,
  compact = false,
  className = ''
}: CommentFormProps) {
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { isSignedIn } = useAuth()
  const dict = useI18n()

  const isLoading = isPending || externalIsSubmitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      setError(dict.comments?.placeholder || 'Comment cannot be empty')
      return
    }

    if (!isSignedIn) {
      // 追踪未登录用户的评论尝试
      analytics.track('comment_attempt_unauthenticated', {
        postId,
        page: window.location.pathname,
        contentLength: content.trim().length
      })
      
      setError(dict.auth?.signInToComment || 'Please sign in to comment')
      return
    }

    setError(null)

    if (onSubmit) {
      // 使用自定义提交处理器（用于回复）
      try {
        // 追踪回复提交开始
         analytics.trackComment(postId, {
           action: 'reply_start',
           parentId,
           contentLength: content.trim().length,
           isCompact: compact
         })
         
          await onSubmit(content.trim())
          setContent('')
         
         // 追踪回复提交成功
         analytics.trackComment(postId, {
           action: 'reply_success',
           parentId,
           contentLength: content.trim().length,
           isCompact: compact
         })
       } catch (error) {
         // 追踪回复提交失败
         analytics.trackComment(postId, {
           action: 'reply_error',
           parentId,
           error: error instanceof Error ? error.message : 'Unknown error',
           contentLength: content.trim().length,
           isCompact: compact
         })
        
        setError('Failed to submit comment')
      }
    } else {
      // 使用默认的Server Action
      // 追踪评论提交开始
      analytics.trackComment(postId, {
        action: 'submit_start',
        contentLength: content.trim().length,
        isCompact: compact
      })
      
      startTransition(async () => {
        try {
          const result = await createCommentAction({
            postId,
            content: content.trim(),
            parentId
          })
          
          setError('')

          if (result.success) {
            // 追踪评论提交成功
            analytics.trackComment(postId, {
              action: 'submit_success',
              commentId: result.data?.id,
              contentLength: content.trim().length,
              isCompact: compact
            })
            
            setContent('')
            // 调用成功回调
            if (onSubmitSuccess) {
              onSubmitSuccess()
            }
          } else {
            // 追踪评论提交失败
            analytics.trackComment(postId, {
              action: 'submit_error',
              error: result.error,
              contentLength: content.trim().length,
              isCompact: compact
            })
            
            setError(result.error || 'Failed to submit comment')
          }
        } catch (error) {
          // 追踪评论提交异常
          analytics.trackComment(postId, {
            action: 'submit_exception',
            error: error instanceof Error ? error.message : 'Unknown error',
            contentLength: content.trim().length,
            isCompact: compact
          })
          
          setError('An unexpected error occurred')
        }
      })
    }
  }

  if (!isSignedIn) {
    return (
      <Card className={className}>
        <CardContent className="p-4 md:p-6 flex flex-col h-full min-h-[120px]">
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground text-center">
              {dict.auth?.signInToComment || 'Please sign in to leave a comment'}
            </p>
          </div>
          <div className="mt-auto flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => {
                if (onAuthRequired) {
                  onAuthRequired()
                } else {
                  // 如果没有提供回调，则跳转到登录页
                  window.location.href = '/sign-in'
                }
              }}
            >
              {dict.auth?.signIn || 'Sign In'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formContent = (
    <div className="flex flex-col h-full">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder || dict.comments?.placeholder || 'Share your thoughts...'}
        className={`resize-none flex-1 ${compact ? 'min-h-[80px]' : 'min-h-[120px]'}`}
        disabled={isLoading}
      />
      
      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center mt-3">
        <div className="text-label-sm text-muted-foreground">
          {content.length}/2000
        </div>
        <Button 
          type="submit" 
          disabled={isLoading || !content.trim() || content.length > 2000}
          size={compact ? "sm" : "default"}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {dict.common?.submitting || 'Submitting...'}
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {parentId ? (dict.comments?.reply || 'Reply') : (dict.comments?.submit || 'Submit')}
            </>
          )}
        </Button>
      </div>
    </div>
  )

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className={`flex flex-col h-full ${className}`}>
        {formContent}
      </form>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4 md:p-6 flex flex-col h-full min-h-[200px]">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {formContent}
        </form>
      </CardContent>
    </Card>
  )
}

export default withComponentMonitoring(CommentFormComponent, 'CommentForm')

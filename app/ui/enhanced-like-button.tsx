'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUser } from '@clerk/nextjs'
import { toggleLikeAction } from '@/lib/actions'
import { toast } from 'sonner'
import { useI18n } from '@/app/context/i18n-provider'

interface EnhancedLikeButtonProps {
  postId: string
  initialLikes: number
  isLikedByUser: boolean
  onAuthRequired?: () => void // 回调函数，当需要认证时调用
  variant?: 'default' | 'compact' // 支持不同的显示模式
  className?: string
}

export function EnhancedLikeButton({
  postId,
  initialLikes,
  isLikedByUser,
  onAuthRequired,
  variant = 'default',
  className = '',
}: EnhancedLikeButtonProps) {
  const { isSignedIn, isLoaded } = useUser()
  const [isPending, startTransition] = useTransition()
  const dictionary = useI18n()

  // 本地状态用于乐观更新
  const [optimisticLikes, setOptimisticLikes] = useState(initialLikes)
  const [optimisticIsLiked, setOptimisticIsLiked] = useState(isLikedByUser)

  const handleLike = () => {
    // 如果用户未登录，触发认证流程
    if (!isSignedIn) {
      if (onAuthRequired) {
        onAuthRequired()
      } else {
        toast.error(dictionary.auth.signInToLikePhotos)
      }
      return
    }

    // 乐观更新 - 立即更新UI
    const newIsLiked = !optimisticIsLiked
    const newLikesCount = newIsLiked ? optimisticLikes + 1 : optimisticLikes - 1

    setOptimisticIsLiked(newIsLiked)
    setOptimisticLikes(newLikesCount)

    // 执行实际的服务器操作
    startTransition(async () => {
      try {
        const result = await toggleLikeAction(postId)

        if (result.success) {
          // 成功时显示消息
          toast.success(result.message)

          // 确保状态与服务器返回的数据一致
          if (result.data) {
            setOptimisticIsLiked(result.data.action === 'liked')
            // 注意：这里我们可能需要重新获取准确的点赞数，
            // 但为了简化，我们保持乐观更新的结果
          }
        } else {
          // 失败时回滚乐观更新
          setOptimisticIsLiked(isLikedByUser)
          setOptimisticLikes(initialLikes)

          // 显示错误消息
          if (result.code === 'UNAUTHORIZED') {
            toast.error(result.error)
            if (onAuthRequired) {
              onAuthRequired()
            }
          } else if (result.code === 'RATE_LIMITED') {
            toast.error(result.error)
          } else {
            toast.error(result.error || dictionary.common.error)
          }
        }
      } catch {
        // 如果出错，回滚乐观更新
        setOptimisticIsLiked(isLikedByUser)
        setOptimisticLikes(initialLikes)
        toast.error(dictionary.common.error)
      }
    })
  }

  // 如果Clerk还在加载，显示加载状态
  if (!isLoaded) {
    return (
      <Button
        variant="outline"
        size={variant === 'compact' ? 'sm' : 'default'}
        disabled
        className={className}
      >
        <Heart className="mr-2 h-4 w-4" />
        {dictionary.common.loading}
      </Button>
    )
  }

  const buttonText =
    variant === 'compact'
      ? optimisticLikes.toString()
      : `${optimisticLikes} ${
          optimisticLikes === 1
            ? dictionary.interactions.like
            : dictionary.interactions.likes
        }`

  return (
    <Button
      variant="ghost"
      size={variant === 'compact' ? 'sm' : 'default'}
      onClick={handleLike}
      disabled={isPending}
      className={`
        bg-gray-100/50 text-gray-600 border border-gray-200/50
        dark:bg-white/90 dark:text-gray-800 dark:border-gray-300 hover:dark:bg-white/90
        shadow-sm transition-all duration-300 ease-in-out hover:scale-110
        ${
          optimisticIsLiked
            ? 'text-red-400 border-red-200 hover:text-red-400 dark:text-red-500 dark:border-red-300'
            : ''
        }
        ${className}
      `
        .trim()
        .replace(/\s+/g, ' ')}
    >
      <Heart
        className={`mr-2 h-4 w-4 transition-all duration-200 ${
          optimisticIsLiked ? 'text-red-400 dark:text-red-500 fill-current scale-110' : ''
        }`}
      />
      {isPending ? dictionary.common.submitting : buttonText}
    </Button>
  )
}

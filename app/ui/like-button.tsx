// app/ui/like-button.tsx
'use client'

import { useTransition } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { likeAction } from '@/lib/actions' // 导入我们创建的 Server Action

export function LikeButton({
  postId,
  initialLikes,
  isLikedByUser,
}: {
  postId: string
  initialLikes: number
  isLikedByUser: boolean // 需要知道当前用户是否已点赞
}) {
  const [isPending, startTransition] = useTransition()

  // 创建一个 onClick 事件处理器
  const handleLike = () => {
    // 使用 startTransition 包裹我们的 Server Action 调用
    startTransition(() => {
      // 调用 Action，并传入需要的 postId
      likeAction(postId)
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLike}
      disabled={isPending}
      // 根据是否已点赞和是否在 pending 中，动态改变样式
      className={isLikedByUser ? 'text-red-500 hover:text-red-600' : ''}
    >
      <Heart
        className={`mr-2 h-4 w-4 ${isLikedByUser ? 'fill-current' : ''}`}
      />
      {isPending ? 'Liking...' : `${initialLikes} Likes`}
    </Button>
  )
}

'use client'

import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { useI18n } from '@/app/context/i18n-provider'
import { withComponentMonitoring } from '@/lib/sentry-client-integration'

interface EnhancedCommentButtonProps {
  commentCount: number
  hasUserCommented?: boolean
  onCommentClick: () => void
  onAuthRequired?: () => void // 回调函数，当需要认证时调用
  variant?: 'default' | 'compact'
  className?: string
}

function EnhancedCommentButton({
  commentCount,
  hasUserCommented = false,
  onCommentClick,
  onAuthRequired,
  variant = 'default',
  className = '',
}: EnhancedCommentButtonProps) {
  const { isSignedIn } = useAuth()
  const dictionary = useI18n()

  const buttonText =
    variant === 'compact'
      ? `${commentCount}`
      : `${commentCount} ${dictionary.interactions?.comments || '评论'}`

  const handleCommentClick = () => {
    if (isSignedIn) {
      onCommentClick()
    } else {
      // 如果用户未登录，触发认证流程
      if (onAuthRequired) {
        onAuthRequired()
      }
    }
  }

  return (
    <Button
      variant="ghost"
      size={variant === 'compact' ? 'sm' : 'default'}
      onClick={handleCommentClick}
      className={`
        bg-gray-100/50 text-gray-600 border border-gray-200/50
        dark:bg-white/90 dark:text-gray-800 dark:border-gray-300 hover:dark:bg-white/90
        shadow-sm transition-all duration-300 ease-in-out hover:scale-110
        ${hasUserCommented ? 'text-blue-400 border-blue-200 dark:text-blue-600 dark:border-gblue-300' : ''}
        ${className}
      `
        .trim()
        .replace(/\s+/g, ' ')}
    >
      <MessageCircle
        className={`mr-2 h-4 w-4 transition-all duration-200 ${
          hasUserCommented ? 'text-blue-400 dark:text-blue-600 fill-current scale-110' : ''
        }`}
      />
      {buttonText}
    </Button>
  )
}

export default withComponentMonitoring(EnhancedCommentButton, 'EnhancedCommentButton')

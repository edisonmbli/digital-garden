// app/ui/comment-count.tsx
'use client'

import { MessageCircle } from 'lucide-react'
import { useI18n } from '@/app/context/i18n-provider'

interface CommentCountProps {
  count: number
  className?: string
  showIcon?: boolean
}

export function CommentCount({ 
  count, 
  className = '', 
  showIcon = true 
}: CommentCountProps) {
  const dict = useI18n()

  return (
    <div className={`flex items-center text-muted-foreground text-body-sm ${className}`}>
      {showIcon && <MessageCircle className="mr-2 h-4 w-4" />}
      <span>
        {count} {dict.interactions?.comments || 'Comments'}
      </span>
    </div>
  )
}
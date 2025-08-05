'use client'

import { useEffect } from 'react'
import { CheckCircle } from 'lucide-react'

interface CommentSuccessToastProps {
  isVisible: boolean
  onHide: () => void
  message?: string
}

export function CommentSuccessToast({ 
  isVisible, 
  onHide,
  message = '评论提交成功'
}: CommentSuccessToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onHide()
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [isVisible, onHide])

  if (!isVisible) return null

  return (
    <div className="flex items-center justify-center p-4 bg-gray-50/80 border border-gray-200/50 rounded-md shadow-sm">
      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
      <span className="text-body-sm text-gray-700">{message}</span>
    </div>
  )
}
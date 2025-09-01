'use client'

// 混合保护组件
// 结合服务端和客户端保护，在客户端加载后提供增强保护

import { ProtectedContent } from './protected-content'

interface HybridProtectedContentProps {
  children: React.ReactNode
  className?: string
  enableCopy?: boolean
  enableSelect?: boolean
  showWatermark?: boolean
  watermarkText?: string
  userId?: string
  postId?: string
  developCollectionId?: string
  protectionLevel?: 'basic' | 'enhanced' | 'maximum'
}

export function HybridProtectedContent({
  children,
  className,
  enableCopy = false,
  enableSelect = true,
  showWatermark = true,
  watermarkText,
  userId,
  postId,
  developCollectionId,
  protectionLevel = 'enhanced',
}: HybridProtectedContentProps) {
  // 始终使用ProtectedContent组件以避免水合错误
  return (
    <ProtectedContent
      className={className}
      enableCopy={enableCopy}
      enableSelect={enableSelect}
      showWatermark={showWatermark}
      watermarkText={watermarkText}
      userId={userId}
      postId={postId}
      developCollectionId={developCollectionId}
      protectionLevel={protectionLevel}
    >
      {children}
    </ProtectedContent>
  )
}
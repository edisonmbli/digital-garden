'use client'

import { useEffect, useState } from 'react'
import { clientLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'

interface ProtectedContentProps {
  children: React.ReactNode
  className?: string
  enableCopy?: boolean
  enableSelect?: boolean
  showWatermark?: boolean
  watermarkText?: string
  // 新增：业务相关参数
  userId?: string // 用户ID（未登录则为空）
  postId?: string // 内容对应的postId
  developCollectionId?: string // 内容所属的develop collectionId
}

export function ProtectedContent({
  children,
  className,
  enableCopy = false,
  enableSelect = true, // 默认允许选择以便阅读
  showWatermark = true,
  watermarkText,
  userId,
  postId,
  developCollectionId,
}: ProtectedContentProps) {
  const defaultWatermarkText =
    process.env.NEXT_PUBLIC_COPYRIGHT_TEXT ||
    '© Digital Garden AI - 未经授权禁止转载'
  const [isClient, setIsClient] = useState(false)

  // 记录内容访问日志
  useEffect(() => {
    if (typeof window !== 'undefined') {
      clientLogger.logContentAccess(
        window.location.href,
        'view',
        {
          userId,
          postId,
          developCollectionId
        }
      )
    }
  }, [userId, postId, developCollectionId])

  useEffect(() => {
    setIsClient(true)

    // 禁用常见的开发者工具快捷键
    const handleKeyDown = (e: KeyboardEvent) => {
      // 禁用 F12, Ctrl+Shift+I, Ctrl+U 等
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C')
      ) {
        e.preventDefault()
        console.warn('开发者工具访问被限制')
        return false
      }

      // 禁用复制快捷键（如果设置）
      if (!enableCopy && e.ctrlKey && (e.key === 'c' || e.key === 'a')) {
        e.preventDefault()
        console.warn('内容复制被限制')
        return false
      }
    }

    // 禁用右键菜单
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    // 禁用选择（如果设置）
    const handleSelectStart = (e: Event) => {
      if (!enableSelect) {
        e.preventDefault()
        return false
      }
    }

    // 检测打印尝试
    const handleBeforePrint = () => {
      console.warn('打印功能被限制')
      alert('为保护知识产权，本页面不支持打印功能')
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('selectstart', handleSelectStart)
    window.addEventListener('beforeprint', handleBeforePrint)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('selectstart', handleSelectStart)
      window.removeEventListener('beforeprint', handleBeforePrint)
    }
  }, [enableCopy, enableSelect])

  if (!isClient) {
    return <div className={className}>{children}</div>
  }

  return (
    <div
      className={cn('relative', !enableSelect && 'select-none', className)}
      style={{
        userSelect: enableSelect ? 'text' : 'none',
        WebkitUserSelect: enableSelect ? 'text' : 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {children}

      {/* 版权水印 */}
      {showWatermark && (
        <div className="fixed bottom-4 right-4 opacity-20 pointer-events-none text-xs text-muted-foreground z-50 bg-background/80 px-2 py-1 rounded backdrop-blur-sm">
          {watermarkText || defaultWatermarkText}
        </div>
      )}
    </div>
  )
}

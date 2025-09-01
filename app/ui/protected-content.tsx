'use client'

import { useEffect, useState, useRef } from 'react'
import { clientLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { initializeContentProtection, protectElement, getUserAgentProtection } from '@/lib/content-protection'

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
  // 新增：增强保护选项
  protectionLevel?: 'basic' | 'enhanced' | 'maximum'
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
  protectionLevel = 'enhanced',
}: ProtectedContentProps) {
  const defaultWatermarkText =
    process.env.NEXT_PUBLIC_COPYRIGHT_TEXT ||
    '© Digital Garden AI - 未经授权禁止转载'
  const [isClient, setIsClient] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false)

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
  }, [])

  useEffect(() => {
    if (!isClient) return
    
    const element = contentRef.current
    if (!element) return

    // 获取用户代理信息
    const userAgent = getUserAgentProtection()
    
    // 为元素添加保护
    protectElement(element, protectionLevel)
    
    // 初始化全局保护
    const cleanup = initializeContentProtection({
      disableRightClick: true,
      disableSelection: !enableSelect,
      disableKeyboardShortcuts: true, // 始终禁用键盘快捷键以防止复制
      disablePrint: true,
      enableScreenshotDetection: protectionLevel === 'maximum',
      enableDevToolsDetection: protectionLevel === 'maximum',
      enableMobileProtection: userAgent.isMobile,
    })

    // 清理函数
    return cleanup
  }, [isClient, enableCopy, enableSelect, protectionLevel])

  if (!isClient) {
    return <div className={className}>{children}</div>
  }

  // 根据保护级别设置样式
  const getProtectionStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      userSelect: enableSelect ? 'text' : 'none',
      WebkitUserSelect: enableSelect ? 'text' : 'none',
      WebkitTouchCallout: 'none',
    }

    if (protectionLevel === 'enhanced' || protectionLevel === 'maximum') {
      return {
        ...baseStyles,
        outline: 'none',
        pointerEvents: (enableSelect ? 'auto' : 'none') as 'auto' | 'none',
      }
    }

    return baseStyles
  }

  return (
    <div
      ref={contentRef}
      className={cn(
        'relative z-0',
        !enableSelect && 'select-none',
        protectionLevel !== 'basic' && 'pointer-events-auto',
        className
      )}
      style={getProtectionStyles()}
      onContextMenu={(e) => {
        e.preventDefault()
        return false
      }}
      onDragStart={(e) => {
        e.preventDefault()
        return false
      }}
    >
      {/* 开发者工具检测警告 */}
      {isDevToolsOpen && protectionLevel === 'maximum' && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg text-center max-w-md">
            <h3 className="text-lg font-semibold mb-4">检测到开发者工具</h3>
            <p className="text-sm text-muted-foreground mb-4">
              为保护内容版权，请关闭开发者工具后继续浏览。
            </p>
            <button
              onClick={() => setIsDevToolsOpen(false)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded"
            >
              我已关闭
            </button>
          </div>
        </div>
      )}

      {/* 内容区域 */}
      <div
        className="relative z-0"
        style={{
          // CSS层面的额外保护
          WebkitUserSelect: enableSelect ? 'text' : 'none',
          MozUserSelect: enableSelect ? 'text' : 'none',
          msUserSelect: enableSelect ? 'text' : 'none',
          userSelect: enableSelect ? 'text' : 'none',
        }}
        suppressHydrationWarning
      >
        {children}
      </div>

      {/* 版权水印 */}
      {showWatermark && (
        <div className="fixed bottom-4 right-4 opacity-20 pointer-events-none text-xs text-muted-foreground z-50 bg-background/80 px-2 py-1 rounded backdrop-blur-sm">
          {watermarkText || defaultWatermarkText}
        </div>
      )}

      {/* 隐形覆盖层（最高保护级别） */}
      {protectionLevel === 'maximum' && !enableSelect && (
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: 'transparent',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        />
      )}
    </div>
  )
}

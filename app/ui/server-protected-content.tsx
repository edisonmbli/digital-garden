// 服务端内容保护组件
// 在服务端渲染时提供基础的内容保护

import { cn } from '@/lib/utils'

interface ServerProtectedContentProps {
  children: React.ReactNode
  className?: string
  enableSelect?: boolean
  showWatermark?: boolean
  watermarkText?: string
  protectionLevel?: 'basic' | 'enhanced' | 'maximum'
}

export function ServerProtectedContent({
  children,
  className,
  enableSelect = true,
  showWatermark = true,
  watermarkText,
  protectionLevel = 'enhanced',
}: ServerProtectedContentProps) {
  const defaultWatermarkText =
    process.env.NEXT_PUBLIC_COPYRIGHT_TEXT ||
    '© Digital Garden AI - 未经授权禁止转载'

  // 服务端保护样式
  const protectionStyles = {
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
  } as React.CSSProperties

  return (
    <>
      {/* 注入CSS保护样式 */}
      <style jsx>{`
        .server-protected-content {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
        
        .server-protected-content * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
        }
        
        .server-protected-content img {
          -webkit-user-drag: none;
          -khtml-user-drag: none;
          -moz-user-drag: none;
          -o-user-drag: none;
          user-drag: none;
          pointer-events: none;
        }
        
        ${protectionLevel === 'maximum' ? `
          .server-protected-content {
            pointer-events: none;
          }
          
          .server-protected-content::selection {
            background: transparent;
          }
          
          .server-protected-content::-moz-selection {
            background: transparent;
          }
        ` : ''}
      `}</style>
      
      <div
        className={cn(
          'relative server-protected-content',
          className
        )}
        style={protectionStyles}
        suppressHydrationWarning
      >
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

        {/* 隐形保护层 */}
        {protectionLevel !== 'basic' && (
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
    </>
  )
}
// app/ui/font-optimization.tsx
'use client'

import { useEffect, useState } from 'react'

// 字体预加载配置
const FONT_PRELOAD_CONFIG = [
  {
    href: '/fonts/inter-var.woff2',
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  },
  {
    href: '/fonts/geist-sans.woff2', 
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  },
] as const

// 字体显示策略
const FONT_DISPLAY_STRATEGY = {
  // 主要字体：快速显示，避免布局偏移
  primary: 'swap',
  // 装饰字体：可选加载，不阻塞渲染
  decorative: 'optional',
  // 图标字体：后备显示
  icon: 'fallback',
} as const

// 字体加载优化组件
export function FontOptimization() {
  useEffect(() => {
    // 检查字体加载API支持
    if ('fonts' in document) {
      // 预加载关键字体
      FONT_PRELOAD_CONFIG.forEach(({ href }) => {
        const font = new FontFace('preload-font', `url(${href})`, {
          display: 'swap',
        })
        
        font.load().then(() => {
          document.fonts.add(font)
        }).catch((error) => {
          console.warn('Font preload failed:', href, error)
        })
      })

      // 监听字体加载状态
      document.fonts.ready.then(() => {
        // 字体加载完成后的优化
        document.documentElement.classList.add('fonts-loaded')
      })
    }

    // 字体加载超时处理
    const fontTimeout = setTimeout(() => {
      document.documentElement.classList.add('fonts-timeout')
    }, 3000) // 3秒超时

    return () => clearTimeout(fontTimeout)
  }, [])

  return null // 这是一个功能性组件，不渲染任何内容
}

// 字体加载状态Hook
export function useFontLoadingState() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isTimeout, setIsTimeout] = useState(false)

  useEffect(() => {
    if ('fonts' in document) {
      document.fonts.ready.then(() => {
        setIsLoaded(true)
      })

      const timeout = setTimeout(() => {
        setIsTimeout(true)
      }, 3000)

      return () => clearTimeout(timeout)
    } else {
      // 不支持字体加载API时，假设已加载
      setIsLoaded(true)
    }
  }, [])

  return { isLoaded, isTimeout }
}

// 字体优化CSS类名生成器
export function getFontOptimizedClassName(
  baseClassName: string,
  fontType: keyof typeof FONT_DISPLAY_STRATEGY = 'primary'
) {
  const displayStrategy = FONT_DISPLAY_STRATEGY[fontType]
  
  return `${baseClassName} font-display-${displayStrategy}`
}

// 关键字体预加载组件（用于_document或layout）
export function CriticalFontPreload() {
  return (
    <>
      {FONT_PRELOAD_CONFIG.map((font, index) => (
        <link
          key={index}
          rel="preload"
          href={font.href}
          as={font.as}
          type={font.type}
          crossOrigin={font.crossOrigin}
        />
      ))}
    </>
  )
}

// 字体加载性能监控
export function trackFontPerformance() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    // 监控字体加载时间
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes('font')) {
          console.log('Font loading performance:', {
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
          })
        }
      })
    })

    observer.observe({ entryTypes: ['resource'] })

    return () => observer.disconnect()
  }
}
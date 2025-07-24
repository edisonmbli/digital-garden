// app/ui/page-transition.tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

// 修复后的渐进增强方案（推荐）
export function PageTransitionProgressive({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // 修复 TypeScript 错误：正确检查 requestIdleCallback 是否为函数
    const timer =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(() => setMounted(true))
        : setTimeout(() => setMounted(true), 0)

    return () => {
      // 修复 TypeScript 错误：正确检查并调用对应的清理函数
      if (typeof window.requestIdleCallback === 'function') {
        window.cancelIdleCallback(timer as number)
      } else {
        clearTimeout(timer as number)
      }
    }
  }, [])

  // 服务端和首次渲染：无动画，但预设样式
  if (!mounted) {
    return (
      <div
        className="w-full opacity-0 translate-y-6 transition-all duration-300 ease-out"
        style={{
          animation:
            'fadeInUp 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
          animationDelay: '0.1s',
        }}
      >
        <style jsx>{`
          @keyframes fadeInUp {
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
        {children}
      </div>
    )
  }

  // 客户端：使用 Framer Motion
  return (
    <div className="relative w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{
            duration: 0.6,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// 优化版本：消除闪烁的上滑效果
export function PageTransitionSlideUpOptimized({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // 在 hydration 完成前，不显示任何内容，避免闪烁
  if (!isHydrated) {
    return <div className="w-full opacity-0">{children}</div>
  }

  return (
    <div className="relative w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          layoutId="page-content"
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{
            duration: 1.5,
            ease: [0.25, 0.46, 0.45, 0.94],
            opacity: { duration: 0.3 },
            y: { duration: 0.6 },
          }}
          className="w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// 方案2：使用 CSS 变量控制初始状态
export function PageTransitionSlideUpCSS({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="relative w-full">
      <style jsx global>{`
        .page-transition-container {
          --initial-opacity: 0;
          --initial-y: 24px;
        }
        .page-transition-container.hydrated {
          --initial-opacity: 1;
          --initial-y: 0px;
        }
      `}</style>
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{
            duration: 0.6,
            ease: [0.25, 0.46, 0.45, 0.94],
            opacity: { duration: 0.3 },
            y: { duration: 0.6 },
          }}
          className="w-full page-transition-container"
          style={{
            opacity: 'var(--initial-opacity)',
            transform: 'translateY(var(--initial-y))',
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// 方案3：延迟渲染策略
export function PageTransitionSlideUpDelayed({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [shouldAnimate, setShouldAnimate] = useState(false)

  useEffect(() => {
    // 延迟一帧，确保 DOM 准备好
    const timer = requestAnimationFrame(() => {
      setShouldAnimate(true)
    })
    return () => cancelAnimationFrame(timer)
  }, [pathname])

  return (
    <div className="relative w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={shouldAnimate ? { opacity: 0, y: 24 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{
            duration: 0.6,
            ease: [0.25, 0.46, 0.45, 0.94],
            opacity: { duration: 0.3 },
            y: { duration: 0.6 },
          }}
          className="w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// 方案4：最激进的解决方案 - 完全客户端渲染（影响SEO！）
export function PageTransitionSlideUpClientOnly({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null // 或者返回一个 loading 状态
  }

  return (
    <div className="relative w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{
            duration: 0.6,
            ease: [0.25, 0.46, 0.45, 0.94],
            opacity: { duration: 0.3 },
            y: { duration: 0.6 },
          }}
          className="w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="relative w-full">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.3,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className="w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// 优化版本1：改进的上滑效果（推荐）
export function PageTransitionSlideUp({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="relative w-full">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{
            duration: 1,
            ease: [0.25, 0.46, 0.45, 0.94], // 更自然的缓动
            opacity: { duration: 0.2 }, // 透明度变化更快
            y: { duration: 0.4 }, // Y轴移动稍慢
          }}
          className="w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// 优化版本2：分层动画（解决残影问题）
export function PageTransitionSlideLayered({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="relative w-full min-h-[50vh]">
      <AnimatePresence initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{
            duration: 0.35,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="w-full"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: pathname.length, // 确保新页面在上层
          }}
        >
          <div className="bg-background w-full min-h-[50vh]">{children}</div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// 优化版本3：渐进式上滑（最接近你的需求）
export function PageTransitionSlideProgressive({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="relative w-full overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={pathname} className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{
              duration: 0.45,
              ease: [0.25, 0.46, 0.45, 0.94],
              opacity: {
                duration: 0.25,
                ease: 'easeOut',
              },
              y: {
                duration: 0.45,
                ease: [0.25, 0.46, 0.45, 0.94],
              },
            }}
            className="w-full"
          >
            {children}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// 优化版本4：无残影的滑动效果
export function PageTransitionSlideClean({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="relative w-full">
      <AnimatePresence
        mode="wait"
        initial={false}
        onExitComplete={() => {
          // 确保退出动画完成后再开始新动画
          window.scrollTo(0, 0)
        }}
      >
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 20, scale: 0.99 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
              duration: 0.4,
              ease: [0.25, 0.46, 0.45, 0.94],
              opacity: { duration: 0.2 },
              y: { duration: 0.4 },
              scale: { duration: 0.3 },
            },
          }}
          exit={{
            opacity: 0,
            y: -10,
            transition: {
              duration: 0.15,
              ease: 'easeIn',
            },
          }}
          className="w-full bg-background"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// 交叉淡入淡出（无闪烁版本）
export function PageTransitionCrossfade({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="relative w-full min-h-screen">
      <AnimatePresence initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{
            duration: 0.3,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// 无动画版本
export function PageTransitionNone({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="w-full">{children}</div>
}

// 导出推荐方案
export const PageTransitionRecommended = PageTransitionProgressive

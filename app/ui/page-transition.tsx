// app/ui/page-transition.tsx
'use client'

import { useContext, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { LayoutRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { useMediaQuery } from '@/hooks/use-media-query'

/**
 * A higher-order component that freezes the router context for its children.
 * This is a workaround for a bug in Next.js where the router context is not preserved
 * during page transitions, causing components to unmount and remount abruptly.
 * By freezing the router context, we can ensure that the old page remains mounted
 * until the new page has finished its enter animation.
 * @see https://github.com/framer/motion/issues/1850
 */
function FrozenRouter({ children }: { children: React.ReactNode }) {
  const context = useContext(LayoutRouterContext)
  const frozen = useRef(context).current

  return (
    <LayoutRouterContext.Provider value={frozen}>
      {children}
    </LayoutRouterContext.Provider>
  )
}

// 桌面端动效：保持原有的滑动效果
const desktopVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

// 移动端动效：简单的淡入淡出
const mobileVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  
  // 根据设备类型选择动效配置
  const variants = isDesktop ? desktopVariants : mobileVariants
  const transition = isDesktop 
    ? {
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1] as const,
      }
    : {
        duration: 0.3,
        ease: 'easeInOut' as const,
      }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
        className="w-full"
      >
        <FrozenRouter>{children}</FrozenRouter>
      </motion.div>
    </AnimatePresence>
  )
}

// 你可以保留这个导出，以便 layout.tsx 不需要修改
export const PageTransitionRecommended = PageTransition

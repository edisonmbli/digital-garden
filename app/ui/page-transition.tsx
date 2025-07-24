// app/ui/page-transition.tsx
'use client'

import { useContext, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { LayoutRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'

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

const variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration: 0.8,
          ease: [0.4, 0, 0.2, 1],
        }}
        className="w-full"
      >
        <FrozenRouter>{children}</FrozenRouter>
      </motion.div>
    </AnimatePresence>
  )
}

// 你可以保留这个导出，以便 layout.tsx 不需要修改
export const PageTransitionRecommended = PageTransition

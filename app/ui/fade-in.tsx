// app/ui/fade-in.tsx
'use client'

import { motion } from 'framer-motion'

export function FadeIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="hidden" // 初始状态
      whileInView="visible" // 当进入视口时，应用 'visible' 状态
      viewport={{ once: true, amount: 0.2 }} // 只触发一次，当元素20%可见时触发
      variants={{
        // 定义不同状态的样式
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
      }}
    >
      {children}
    </motion.div>
  )
}

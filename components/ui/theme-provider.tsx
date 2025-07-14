// components/theme-provider.tsx
'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes'

// 2. 我们的 ThemeProvider 组件的 props 类型，完全等同于 NextThemesProvider 的 props 类型
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // 3. 将所有 props 透明地传递给被包裹的组件
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

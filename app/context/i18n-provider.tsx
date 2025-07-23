// app/context/i18n-provider.tsx
'use client'

import { createContext, useContext } from 'react'
import { getDictionary } from '@/lib/dictionary'

// 1. 定义我们字典的类型
type DictionaryType = Awaited<ReturnType<typeof getDictionary>>

// 2. 创建一个 Context，并提供一个默认值
const I18nContext = createContext<DictionaryType | null>(null)

// 3. 创建我们的 Provider 组件
export function I18nProvider({
  dictionary,
  children,
}: {
  dictionary: DictionaryType
  children: React.ReactNode
}) {
  return (
    <I18nContext.Provider value={dictionary}>{children}</I18nContext.Provider>
  )
}

// 4. 创建自定义 Hook
export function useI18n() {
  const context = useContext(I18nContext)
  if (context === null) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

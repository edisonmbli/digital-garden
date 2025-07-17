// app/lib/dictionary.ts
import 'server-only'
import { cache } from 'react' // 1. 导入 React cache
import type { Locale } from '@/i18n-config'
import { enUS, zhCN } from '@clerk/localizations'

// 创建一个语言包的映射表
type ClerkLocalization = typeof enUS
const clerkLocalizations: Record<Locale, ClerkLocalization> = {
  en: enUS,
  zh: zhCN,
}

const dictionaries = {
  en: () => import('@/dictionaries/en.json').then((module) => module.default),
  zh: () => import('@/dictionaries/zh.json').then((module) => module.default),
}

export const getDictionary = cache(
  async (locale: Locale) => dictionaries[locale]?.() ?? dictionaries.en()
)

export const getClerkLocalization = (locale: Locale) => {
  return clerkLocalizations[locale]
}

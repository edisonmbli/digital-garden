// app/lib/dictionary.ts
import 'server-only'
import type { Locale } from '@/i18n-config'
import { enUS, zhCN } from '@clerk/localizations'

// 创建一个语言包的映射表
const clerkLocalizations: Record<Locale, typeof enUS> = {
  en: enUS,
  zh: zhCN,
}

type Dictionary = typeof import('@/dictionaries/en.json')
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('@/dictionaries/en.json').then((module) => module.default),
  zh: () => import('@/dictionaries/zh.json').then((module) => module.default),
}

export const getDictionary = async (locale: Locale) => {
  return dictionaries[locale]?.() ?? dictionaries.en()
}

export const getClerkLocalization = (locale: Locale) => {
  return clerkLocalizations[locale]
}

// app/lib/dictionary.ts
import 'server-only'
import type { Locale } from '@/i18n-config'

// 1. 明确地为 dictionaries 对象标注类型
//    Record<Locale, ...> 的意思是：这是一个对象，
//    它的键 (key) 必须是 Locale 类型 ('en' 或 'zh')
//    它的值 (value) 是一个返回 Promise 的函数
const dictionaries: Record<
  Locale,
  () => Promise<{
    header: {
      gallery: string
      log: string
      about: string
    }
    homepage: {
      title: string
      enter_button: string
    }
  }>
> = {
  en: () => import('@/dictionaries/en.json').then((module) => module.default),
  zh: () => import('@/dictionaries/zh.json').then((module) => module.default),
}

export const getDictionary = async (locale: Locale) => {
  // 2. 现在，TypeScript 完全理解 dictionaries[locale] 是一个安全的操作
  return dictionaries[locale]?.() ?? dictionaries.en()
}

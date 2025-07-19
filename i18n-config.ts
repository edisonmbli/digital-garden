// i18n-config.ts
export const i18n = {
  defaultLocale: 'en',
  locales: ['en', 'zh'],
} as const

export type Locale = (typeof i18n)['locales'][number]

// 导出一个可复用的参数生成函数
export function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }))
}

// app/[lang]/log/page.tsx
import { LogPageShell } from '@/app/ui/log-page-shell'
import { generateStaticParams } from '@/i18n-config'
import { getDictionary } from '@/lib/dictionary'
import { type Locale } from '@/i18n-config'

// 告诉 Next.js 为 'en' 和 'zh' 生成此页面的静态版本
export { generateStaticParams }

export default async function LogPage({
  params,
}: {
  params: { lang: Locale }
}) {
  const { lang } = await params
  const dictionary = await getDictionary(lang)
  return <LogPageShell dictionary={dictionary} />
}

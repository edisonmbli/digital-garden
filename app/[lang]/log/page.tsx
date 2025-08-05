// app/[lang]/log/page.tsx
import { LogPageShell } from '@/app/ui/log-page-shell'
import { Locale, generateStaticParams } from '@/i18n-config'
import { getDictionary } from '@/lib/dictionary'
import { getAllDevCollectionsAndLogs } from '@/lib/dal'

// 告诉 Next.js 为 'en' 和 'zh' 生成此页面的静态版本
export { generateStaticParams }

export default async function LogPage(props: {
  params: Promise<{ lang: Locale }>
}) {
  const params = await props.params
  const { lang } = params

  // 在服务端并行获取数据
  const dictionary = await getDictionary(lang)
  const collections = await getAllDevCollectionsAndLogs(lang)

  // 将获取到的所有教程合集和当前语言，传递给 UI Shell 组件
  return <LogPageShell dictionary={dictionary} collections={collections} lang={lang} />
}

// app/[lang]/gallery/page.tsx
import { GalleryPageShell } from '@/app/ui/gallery-page-shell'
import { Locale, generateStaticParams } from '@/i18n-config'
import { getAllCollections } from '@/lib/dal'

// 告诉 Next.js 为 'en' 和 'zh' 生成此页面的静态版本
export { generateStaticParams }

export default async function GalleryPage(props: {
  params: Promise<{ lang: Locale }>
}) {
  const params = await props.params
  const { lang } = params

  // 在服务端并行获取数据
  const collections = await getAllCollections(lang)

  // 将获取到的所有摄影集和当前语言，传递给 UI Shell 组件
  return <GalleryPageShell collections={collections} lang={lang} />
}

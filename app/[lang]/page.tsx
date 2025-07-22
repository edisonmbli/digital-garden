// app/[lang]/page.tsx
import { HomePageShell } from '@/app/ui/home-page-shell'
import { Locale, generateStaticParams } from '@/i18n-config'
import { getDictionary } from '@/lib/dictionary'
import { getHeroCollections } from '@/lib/dal'

// 告诉 Next.js 为 'en' 和 'zh' 生成此页面的静态版本
export { generateStaticParams }

export default async function Home(props: {
  params: Promise<{ lang: Locale }>
}) {
  const params = await props.params
  const { lang } = params

  // 在服务端并行获取数据
  const dictionary = await getDictionary(lang)
  const heroCollections = await getHeroCollections(lang)

  // 将获取到的精选摄影集，传递给 UI Shell 组件
  return <HomePageShell dictionary={dictionary} collections={heroCollections} />
}

// app/[lang]/page.tsx
import { HomePageShell } from '@/app/ui/home-page-shell'
import { generateStaticParams } from '@/i18n-config'
import { getDictionary } from '@/lib/dictionary'
import { Locale } from '@/i18n-config'

// 告诉 Next.js 为 'en' 和 'zh' 生成此页面的静态版本
export { generateStaticParams }

export default async function Home(props: { params: Promise<{ lang: Locale }> }) {
  const params = await props.params;
  // const lang = params.lang
  const { lang } = params
  const dictionary = await getDictionary(lang)
  return <HomePageShell dictionary={dictionary} />
}

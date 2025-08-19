// app/[lang]/page.tsx
import { type Metadata } from 'next'
import { HomePageShell } from '@/app/ui/home-page-shell'
import { Locale, generateStaticParams } from '@/i18n-config'
import { getDictionary } from '@/lib/dictionary'
import { getHeroCollections } from '@/lib/dal'
import { generatePageMetadata, generateStructuredData } from '@/lib/seo-utils'

// 告诉 Next.js 为 'en' 和 'zh' 生成此页面的静态版本
export { generateStaticParams }

// 生成动态metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>
}): Promise<Metadata> {
  const { lang } = await params
  const dictionary = await getDictionary(lang)
  
  const title = dictionary.header.title
  const description = lang === 'zh' 
    ? '探索摄影作品集和开发教程，记录创作与技术的双重旅程'
    : 'Explore photography collections and development tutorials, documenting the dual journey of creativity and technology'
  
  return generatePageMetadata({
    title,
    description,
    path: '/',
    lang,
    type: 'website',
  })
}

export default async function Home(props: {
  params: Promise<{ lang: Locale }>
}) {
  const params = await props.params
  const { lang } = params

  // 在服务端并行获取数据
  const dictionary = await getDictionary(lang)
  const heroCollections = await getHeroCollections()
  
  // 获取首张图片用于预加载（LCP优化）
  const firstImage = heroCollections[0]?.coverImageUrl

  // 生成结构化数据
  const structuredData = generateStructuredData({
    type: 'WebSite',
    title: dictionary.header.title,
    description: lang === 'zh' 
      ? '探索摄影作品集和开发教程，记录创作与技术的双重旅程'
      : 'Explore photography collections and development tutorials, documenting the dual journey of creativity and technology',
    url: '/',
  })

  // 将获取到的精选摄影集，传递给 UI Shell 组件
  return (
    <>
      {/* 关键图片预加载 - LCP优化 */}
      {firstImage && (
        <link
          rel="preload"
          as="image"
          href={firstImage}
          fetchPriority="high"
        />
      )}
      
      {/* 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <HomePageShell dictionary={dictionary} collections={heroCollections} lang={lang} />
    </>
  )
}

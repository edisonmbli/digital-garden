import { getAuthorBySlug } from '@/lib/dal'
import { generateAuthorSEO } from '@/lib/seo-utils'
import type { Locale } from '@/i18n-config'
import { AboutPageContent } from '../../ui/about-page-content'
import { notFound } from 'next/navigation'

interface AboutPageProps {
  params: Promise<{
    lang: Locale
  }>
}

// --- 静态路径生成 ---
export async function generateStaticParams() {
  // 为所有支持的语言生成静态路径
  const supportedLanguages: Locale[] = ['en', 'zh']

  const params = supportedLanguages.map((lang) => ({
    lang,
  }))

  return params
}

// --- SEO 元数据生成 ---
export async function generateMetadata({ params }: AboutPageProps) {
  const { lang } = await params

  // 尝试获取作者信息以生成SEO
  const author = await getAuthorBySlug('main')

  if (author) {
    // 使用真实作者数据生成SEO
    return generateAuthorSEO({
      author,
      lang,
      path: `/${lang}/about`,
    })
  }

  // 兜底SEO（当没有作者数据时）
  return {
    title: lang === 'zh' ? '关于我' : 'About Me',
    description:
      lang === 'zh'
        ? '了解更多关于我的信息，我的背景和创作历程。'
        : 'Learn more about me, my background and creative journey.',
  }
}

// --- 主要页面组件 ---
export default async function AboutPage({ params }: AboutPageProps) {
  const { lang } = await params

  // 获取作者信息
  const author = await getAuthorBySlug('main')

  // 如果没有找到作者，显示404页面
  if (!author) {
    notFound()
  }

  return <AboutPageContent author={author} lang={lang} />
}

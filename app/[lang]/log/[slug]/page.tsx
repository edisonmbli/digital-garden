// app/[lang]/log/[slug]/page.tsx

import { type Locale } from '@/i18n-config'
import {
  getLogPostBySlug,
  getLikesAndCommentsForPost,
  getTranslationsBySlug,
} from '@/lib/dal'
import { notFound } from 'next/navigation'
import { client as sanityClient } from '@/sanity/client'
import { groq } from 'next-sanity'

export async function generateStaticParams() {
  const query = groq`*[_type == "log" && defined(slug.current) && defined(language)]{ "slug": slug.current, language }`
  const results = await sanityClient.fetch<
    { slug: string; language: Locale }[]
  >(query)

  return results.map((r) => ({
    lang: r.language,
    slug: r.slug,
  }))
}

// --- 页面组件 ---
export default async function LogPostPage({
  params,
}: {
  params: Promise<{ lang: Locale; slug: string }>
}) {
  const { lang, slug } = await params

  // 并行获取所有需要的数据
  const [translations, postContent] = await Promise.all([
    getTranslationsBySlug({ slug, lang, type: 'log' }),
    getLogPostBySlug(slug, lang),
  ])

  // 如果文章不存在，显示 404 页面
  if (!postContent) {
    notFound()
  }

  // 将翻译数组转换为映射对象
  const translationMap = translations.reduce((acc, t) => {
    acc[t.language] = t.slug
    return acc
  }, {} as Record<string, string>)

  // 2. 注意：这里我们通过 postContent._id 来获取关联的互动数据
  const interactions = await getLikesAndCommentsForPost(postContent._id)

  return (
    <article className="container py-12 max-w-3xl mx-auto">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tighter leading-tight">
          {postContent.title}
        </h1>
        <p className="text-muted-foreground mt-2">
          {new Date(postContent.publishedAt).toLocaleDateString(lang, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}{' '}
          by {postContent.author.name}
        </p>
      </header>

      <div className="prose dark:prose-invert max-w-none">
        {/* 在这里，我们将需要一个组件来渲染 Portable Text (postContent.content) */}
        {/* 我们将在第七章，深入交互时，再来创建这个 <PortableTextRenderer /> 组件 */}
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Interactions</h2>
        {/* 在这里，我们将需要组件来渲染点赞按钮和评论区 */}
        {/* 这同样将在第七章实现 */}
        <p>{interactions?.likes.length || 0} Likes</p>
      </section>

      {/* 隐藏的翻译数据，供语言切换器使用 */}
      <script
        type="application/json"
        id="translation-map"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(translationMap),
        }}
      />
    </article>
  )
}

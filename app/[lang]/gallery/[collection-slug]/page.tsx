// app/[lang]/gallery/[collection-slug]/page.tsx

import { type Locale } from '@/i18n-config'
import { getGroupAndPhotosBySlug } from '@/lib/dal'
import { notFound } from 'next/navigation'
import { client as sanityClient } from '@/sanity/client'
import { groq } from 'next-sanity'

// --- 静态路径生成 ---
export async function generateStaticParams() {
  const query = groq`*[_type == "collection" && defined(slug.current) && defined(language)]{ "slug": slug.current, language }`
  const results = await sanityClient.fetch<
    { slug: string; language: Locale }[]
  >(query)

  return results.map((r) => ({
    lang: r.language,
    'collection-slug': r.slug, // 注意：这里的 key 必须与文件夹名 [collection-slug] 完全一致
  }))
}

// --- 页面组件 ---
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ 'collection-slug': string; lang: Locale }>
}) {
  const { 'collection-slug': collectionSlug, lang } = await params
  const collection = await getGroupAndPhotosBySlug(collectionSlug, lang)

  if (!collection) {
    notFound()
  }

  return (
    <div className="container py-12">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold">{collection.name}</h1>
        <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
          {collection.description}
        </p>
      </header>

      <main>
        {/* 这里就是我们将在第七章，用瀑布流布局和无限滚动，来渲染 group.photos 的地方 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {collection.photos.map((photo) => (
            <div key={photo._id} className="aspect-square bg-muted rounded-lg">
              {/* 临时占位符，我们会在后面用 <Image /> 替换 */}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

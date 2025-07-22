// app/[lang]/gallery/[collection-slug]/page.tsx

import { type Locale } from '@/i18n-config'
import { getGroupAndPhotosBySlug } from '@/lib/dal'
import { notFound } from 'next/navigation'
import { client as sanityClient } from '@/sanity/client'
import { groq } from 'next-sanity'
import { PhotoGrid } from '@/app/ui/photo-grid'

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
    <div className="w-full py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold">{collection.name}</h1>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            {collection.description}
          </p>
        </header>

        <main>
          {/* 使用 PhotoGrid 来渲染照片，并传入真实数据 */}
          <PhotoGrid photos={collection.photos} />
        </main>
      </div>
    </div>
  )
}

// app/[lang]/gallery/[collection-slug]/page.tsx

import { type Locale } from '@/i18n-config'
import { getGroupAndPhotosBySlug } from '@/lib/dal'
import { notFound } from 'next/navigation'
import { client as sanityClient } from '@/sanity/client'
import { groq } from 'next-sanity'
import { InfinitePhotoGrid } from '@/app/ui/infinite-photo-grid'
import { getDictionary } from '@/lib/dictionary'

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

  // 并行获取数据和字典
  const [initialGroupData, dictionary] = await Promise.all([
    getGroupAndPhotosBySlug(collectionSlug, lang, 1), //  默认第一页数据
    getDictionary(lang),
  ])

  if (!initialGroupData) {
    notFound()
  }

  return (
    <div className="w-full py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold">{initialGroupData.name}</h1>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            {initialGroupData.description}
          </p>
        </header>
        <main>
          {/* <PhotoGrid photos={collection.photos} /> */}
          {/* 将第一页的数据，作为初始状态，传递给我们的无限滚动组件 */}
          <InfinitePhotoGrid
            initialPhotos={initialGroupData.photos}
            collectionSlug={collectionSlug}
            lang={lang}
            translations={{
              loading: dictionary.gallery.loading,
              allPhotosLoaded: dictionary.gallery.allPhotosLoaded,
            }}
          />
        </main>
      </div>
    </div>
  )
}

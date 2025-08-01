// app/[lang]/gallery/[collection-slug]/page.tsx

import { type Locale } from '@/i18n-config'
import { getGroupAndPhotosBySlug } from '@/lib/dal'
import { notFound } from 'next/navigation'
import { client as sanityClient } from '@/sanity/client'
import { groq } from 'next-sanity'
import { InfinitePhotoGrid } from '@/app/ui/infinite-photo-grid'

// --- 静态路径生成 ---
export async function generateStaticParams() {
  const query = groq`*[_type == "collection" && defined(slug.current)]{ "slug": slug.current }`
  const results = await sanityClient.fetch<{ slug: string }[]>(query)

  // 为每个collection生成所有支持的语言路径
  const supportedLanguages: Locale[] = ['en', 'zh']
  
  return results.flatMap((r) =>
    supportedLanguages.map((lang) => ({
      lang,
      'collection-slug': r.slug,
    }))
  )
}

// --- 页面组件 ---
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ 'collection-slug': string; lang: Locale }>
}) {
  const { 'collection-slug': collectionSlug, lang } = await params

  const initialGroupData = await getGroupAndPhotosBySlug(
    collectionSlug,
    lang,
    1
  )

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
          <InfinitePhotoGrid
            initialPhotos={initialGroupData.photos}
            collectionSlug={collectionSlug}
            lang={lang}
          />
        </main>
      </div>
    </div>
  )
}

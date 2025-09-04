// app/[lang]/gallery/[collection-slug]/page.tsx

import { type Metadata } from 'next'
import { type Locale } from '@/i18n-config'
import { getCollectionAndPhotosBySlug } from '@/lib/dal'
import { generateCollectionSEO, generateStructuredData } from '@/lib/seo-utils'
import { notFound } from 'next/navigation'
import { sanityServerClient } from '@/lib/sanity-server'
import { groq } from 'next-sanity'
import { InfinitePhotoGrid } from '@/app/ui/infinite-photo-grid'
// import { CopyrightNotice } from '@/app/ui/copyright-notice'
// import { getDictionary } from '@/lib/dictionary'

// --- 静态路径生成 ---
export async function generateStaticParams() {
  // 构建时使用服务端客户端获取已发布的内容
  const query = groq`*[_type == "collection" && defined(slug.current)]{ "slug": slug.current }`
  const results = await sanityServerClient.fetch<{ slug: string }[]>(query)

  // 为每个collection生成所有支持的语言路径
  const supportedLanguages: Locale[] = ['en', 'zh']

  return results.flatMap((r) =>
    supportedLanguages.map((lang) => ({
      lang,
      'collection-slug': r.slug,
    }))
  )
}

// --- 动态metadata生成 ---
export async function generateMetadata({
  params,
}: {
  params: Promise<{ 'collection-slug': string; lang: Locale }>
}): Promise<Metadata> {
  const { 'collection-slug': collectionSlug, lang } = await params
  const collectionData = await getCollectionAndPhotosBySlug(
    collectionSlug,
    lang
  )

  if (!collectionData) {
    return {
      title: 'Collection Not Found',
      description: 'The requested photo collection could not be found.',
    }
  }

  // 使用智能的多层级SEO内容生成策略
  return generateCollectionSEO({
    collection: collectionData,
    lang,
    path: `/gallery/${collectionSlug}`,
  })
}

// --- 页面组件 ---
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ 'collection-slug': string; lang: Locale }>
}) {
  const { 'collection-slug': collectionSlug, lang } = await params

  const initialGroupData = await getCollectionAndPhotosBySlug(
    collectionSlug,
    lang,
    1
  )

  if (!initialGroupData) {
    notFound()
  }

  // 获取字典数据
  // const dict = await getDictionary(lang)

  // 生成结构化数据
  const structuredData = generateStructuredData({
    type: 'ImageGallery',
    title: initialGroupData.name || 'Photo Collection',
    description:
      initialGroupData.description ||
      `Explore the ${initialGroupData.name} photo collection`,
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/${lang}/gallery/${collectionSlug}`,
    image: initialGroupData.photos?.[0]?.imageUrl,
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="w-full py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <header className="text-center mb-8">
            <h1 className="text-display-sm md:text-display-md text-foreground">
              {initialGroupData.name}
            </h1>
            <p className="text-body-base font-sans text-muted-foreground mt-2 max-w-2xl mx-auto leading-relaxed">
              {initialGroupData.description}
            </p>
          </header>

          <main>
            <InfinitePhotoGrid
              initialPhotos={initialGroupData.photos}
              collectionSlug={collectionSlug}
              collectionId={initialGroupData._id}
              lang={lang}
            />
            {/* 版权声明 */}
            {/* <CopyrightNotice 
              contentType="photo" 
              className="mt-16"
              copyrightData={{
                title: dict.copyright?.photo?.title,
                content: dict.copyright?.photo?.content,
                minimal: dict.copyright?.photo?.minimal,
              }}
            /> */}
          </main>
        </div>
      </div>
    </>
  )
}

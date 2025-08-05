// app/[lang]/log/[log-slug]/page.tsx

import { getDictionary } from '@/lib/dictionary'
import { getLogPostWithInteractions } from '@/lib/dal'
import { type Locale } from '@/i18n-config'
import { notFound } from 'next/navigation'
import { LogDetailPage } from '@/app/ui/log-detail-page'
import { client as sanityClient } from '@/sanity/client'
import { groq } from 'next-sanity'

export async function generateStaticParams() {
  const logs = await sanityClient.fetch(groq`
    *[_type == "log" && defined(slug.current)] {
      "slug": slug.current
    }
  `)

  return logs.map((log: { slug: string }) => ({
    'log-slug': log.slug,
  }))
}

export default async function LogPostPage({
  params,
}: {
  params: Promise<{ lang: Locale; 'log-slug': string }>
}) {
  const { lang, 'log-slug': logSlug } = await params

  // 获取字典
  const dictionary = await getDictionary(lang)

  // 获取文章数据和交互数据
  const enrichedLogPost = await getLogPostWithInteractions(logSlug, lang)

  if (!enrichedLogPost) {
    notFound()
  }

  // 从enrichedLogPost中提取合集和所有文章数据
  const collection = enrichedLogPost.collection ? {
    name: enrichedLogPost.collection.name
  } : null
  const allLogsInCollection = enrichedLogPost.collection?.logs || []

  // 添加调试信息
  console.log('🔍 Debug: Page data preparation:', {
    hasCollection: !!enrichedLogPost.collection,
    collectionName: enrichedLogPost.collection?.name,
    totalLogsInCollection: enrichedLogPost.collection?.logs?.length || 0,
    allLogsCount: allLogsInCollection.length,
    currentLogSlug: logSlug,
    allLogSlugs: allLogsInCollection.map((log: { slug: string }) => log.slug)
  })

  // 获取翻译映射 - 暂时使用空对象，后续可以实现
  const translationMap: Record<string, string> = {}

  return (
    <LogDetailPage
      enrichedLogPost={enrichedLogPost}
      allLogsInCollection={allLogsInCollection}
      currentLogSlug={logSlug}
      collection={collection}
      lang={lang}
      dictionary={{
        develop: {
          title: dictionary.develop.title,
          publishedOn: dictionary.develop.publishedOn,
          by: dictionary.develop.by
        },
        common: {
          tableOfContents: dictionary.common.tableOfContents
        }
      }}
      translationMap={translationMap}
    />
  )
}
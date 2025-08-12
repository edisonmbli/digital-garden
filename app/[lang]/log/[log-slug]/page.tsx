// app/[lang]/log/[log-slug]/page.tsx

import { type Metadata } from 'next'
import { getDictionary } from '@/lib/dictionary'
import { getLogPostWithInteractions } from '@/lib/dal'
import { generateLogSEO, generateStructuredData } from '@/lib/seo-utils'
import { type Locale } from '@/i18n-config'
import { notFound } from 'next/navigation'
import { LogDetailPage } from '@/app/ui/log-detail-page'
import { client as sanityClient } from '@/sanity/client'
import { groq } from 'next-sanity'

export async function generateStaticParams() {
  // 构建时使用生产客户端获取已发布的内容
  const logs = await sanityClient.fetch(groq`
    *[_type == "log" && defined(slug.current)] {
      "slug": slug.current
    }
  `)

  return logs.map((log: { slug: string }) => ({
    'log-slug': log.slug,
  }))
}

// 生成动态metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale; 'log-slug': string }>
}): Promise<Metadata> {
  const { lang, 'log-slug': logSlug } = await params
  const enrichedLogPost = await getLogPostWithInteractions(logSlug, lang)
  
  if (!enrichedLogPost) {
    return {
      title: 'Article Not Found',
      description: 'The requested article could not be found.',
    }
  }
  
  // 使用智能的多层级SEO内容生成策略
  return generateLogSEO({
    log: enrichedLogPost,
    lang,
    path: `/log/${logSlug}`,
  })
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

  // 获取翻译映射 - 暂时使用空对象，后续可以实现
  const translationMap: Record<string, string> = {}

  // 获取版权数据
  const copyrightData = {
    title: dictionary.copyright?.tutorial?.title,
    content: dictionary.copyright?.tutorial?.content,
    minimal: dictionary.copyright?.tutorial?.minimal,
  }

  // 生成结构化数据 - 使用与metadata相同的description逻辑
  let structuredDescription = ''
  if (enrichedLogPost.excerpt) {
    structuredDescription = enrichedLogPost.excerpt
  } else if (enrichedLogPost.content && enrichedLogPost.content.length > 0) {
    const textBlocks = enrichedLogPost.content
      .filter(block => block._type === 'block' && block.children)
      .slice(0, 2)
    
    const extractedText = textBlocks
      .map(block => 
        block.children
          ?.filter(child => child._type === 'span' && child.text)
          .map(child => child.text)
          .join('')
      )
      .join(' ')
      .trim()
    
    structuredDescription = extractedText.length > 160 
      ? extractedText.substring(0, 157) + '...'
      : extractedText || `Read about ${enrichedLogPost.title} in our development blog`
  } else {
    structuredDescription = `Read about ${enrichedLogPost.title} in our development blog`
  }

  const structuredData = generateStructuredData({
    type: 'Article',
    title: enrichedLogPost.title,
    description: structuredDescription,
    url: `/log/${logSlug}`,
    image: enrichedLogPost.mainImageUrl,
    publishedTime: enrichedLogPost.publishedAt,
    author: enrichedLogPost.author?.name || 'Anonymous',
  })

  return (
    <>
      {/* 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
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
        copyrightData={copyrightData}
      />
    </>
  )
}
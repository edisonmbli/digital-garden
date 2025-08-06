import { MetadataRoute } from 'next'
import { getAllCollections, getLogPosts } from '@/lib/dal'
import { type Locale } from '@/i18n-config'

// 安全的日期创建函数
function safeDate(dateValue: string | Date | null | undefined): Date {
  if (!dateValue) return new Date()
  
  const date = new Date(dateValue)
  if (isNaN(date.getTime())) {
    return new Date()
  }
  
  return date
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'
  const languages: Locale[] = ['en', 'zh']
  
  // 基础页面
  const staticPages = [
    '',
    '/gallery',
    '/log',
  ]
  
  // 为每种语言生成静态页面
  const staticUrls: MetadataRoute.Sitemap = []
  for (const lang of languages) {
    for (const page of staticPages) {
      staticUrls.push({
        url: `${baseUrl}/${lang}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'daily' : 'weekly',
        priority: page === '' ? 1 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            languages.map(l => [l, `${baseUrl}/${l}${page}`])
          ),
        },
      })
    }
  }
  
  try {
    // 获取动态内容
    const collections = await getAllCollections()
    
    // 为每种语言获取日志
    const allLogs = await Promise.all(
      languages.map(lang => getLogPosts(lang))
    )
    
    // 生成集合页面
    const collectionUrls: MetadataRoute.Sitemap = []
    for (const collection of collections) {
      for (const lang of languages) {
        const localizedSlug = collection.i18n?.[lang]?.slug || collection.slug
        if (localizedSlug) {
          collectionUrls.push({
            url: `${baseUrl}/${lang}/gallery/${localizedSlug}`,
            lastModified: safeDate(collection.updatedAt),
            changeFrequency: 'weekly',
            priority: 0.7,
            alternates: {
              languages: Object.fromEntries(
                languages.map(l => {
                  const altSlug = collection.i18n?.[l]?.slug || collection.slug
                  return [l, `${baseUrl}/${l}/gallery/${altSlug}`]
                })
              ),
            },
          })
        }
      }
    }
    
    // 生成日志页面
    const logUrls: MetadataRoute.Sitemap = []
    allLogs.forEach((logs, langIndex) => {
      const lang = languages[langIndex]
      logs.forEach(log => {
        if (log.slug) {
          logUrls.push({
            url: `${baseUrl}/${lang}/log/${log.slug}`,
            lastModified: safeDate(log.publishedAt),
            changeFrequency: 'monthly',
            priority: 0.6,
            alternates: {
              languages: Object.fromEntries(
                languages.map(l => [l, `${baseUrl}/${l}/log/${log.slug}`])
              ),
            },
          })
        }
      })
    })
    
    return [...staticUrls, ...collectionUrls, ...logUrls]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    // 如果动态内容获取失败，至少返回静态页面
    return staticUrls
  }
}
// lib/content-relationship-mapper.ts
import 'server-only'
import { groq } from 'next-sanity'
import { sanityServerClient } from '@/lib/sanity-server'
import { logger } from './logger'
import type { SanityDocument } from '@sanity/client'
import type { Locale } from '@/i18n-config'

/**
 * ContentRelationshipMapper 负责映射 Sanity 文档之间的关联关系
 * 实现精准的缓存失效策略，确保相关内容的缓存能够正确失效
 */
export class ContentRelationshipMapper {
  private static readonly RELATIONSHIPS = {
    collection: {
      // 直接影响的缓存标签
      directTags: (doc: SanityDocument) => [
        'collections',
        `collection:${doc._id}`,
        `collection:${doc.slug?.current}`,
        'homepage-collections',
        'gallery-collections'
      ],
      
      // 间接影响的缓存标签（通过关联关系）
      indirectTags: async (doc: SanityDocument) => {
        const tags: string[] = []
        
        // 如果是精选集合，影响首页
        if (doc.isFeatured) {
          tags.push('featured-collections')
        }
        
        // 查找包含此集合照片的相关标签
        if (doc.photos && Array.isArray(doc.photos)) {
          const photoIds = doc.photos
            .map((photo: { _ref?: string }) => photo._ref)
            .filter((id): id is string => Boolean(id))
          if (photoIds.length > 0) {
            tags.push(
              'photos',
              `collection-photos:${doc.slug?.current}`,
              ...photoIds.map((id: string) => `photo:${id}`)
            )
          }
        }
        
        return tags
      },
      
      // 受影响的路径
      affectedPaths: (doc: SanityDocument) => {
        const paths = [
          '/',
          '/gallery',
          `/gallery/${doc.slug?.current}`
        ]
        
        // 多语言路径
        const langs: Locale[] = ['zh', 'en']
        langs.forEach(lang => {
          paths.push(
            `/${lang}`,
            `/${lang}/gallery`,
            `/${lang}/gallery/${doc.slug?.current}`
          )
        })
        
        return paths
      }
    },
    
    photo: {
      directTags: (doc: SanityDocument) => [
        'photos',
        `photo:${doc._id}`
      ],
      
      indirectTags: async (doc: SanityDocument) => {
        // 查找包含此照片的集合
        const parentCollections = await ContentRelationshipMapper.getParentCollections(doc._id)
        return parentCollections.flatMap(collection => [
          `collection:${collection._id}`,
          `collection:${collection.slug?.current}`,
          `collection-photos:${collection.slug?.current}`
        ])
      },
      
      affectedPaths: async (doc: SanityDocument) => {
        const parentCollections = await ContentRelationshipMapper.getParentCollections(doc._id)
        const paths: string[] = []
        
        parentCollections.forEach(collection => {
          const langs: Locale[] = ['zh', 'en']
          langs.forEach(lang => {
            paths.push(
              `/gallery/${collection.slug?.current}`,
              `/${lang}/gallery/${collection.slug?.current}`
            )
          })
        })
        
        return paths
      }
    },
    
    log: {
      directTags: (doc: SanityDocument) => [
        'logs',
        `log:${doc._id}`,
        `log:${doc.slug?.current}`,
        `logs:${doc.language}`,
        'log-list',
        'log-detail'
      ],
      
      indirectTags: async (doc: SanityDocument) => {
        // 查找包含此 log 的 devCollection
        const parentCollections = await ContentRelationshipMapper.getParentDevCollections(doc._id)
        return parentCollections.flatMap(collection => [
          `dev-collection:${collection._id}`,
          `dev-collection:${collection.slug?.current}`,
          `dev-collections:${doc.language}`,
          'log-collection-mapping'
        ])
      },
      
      affectedPaths: async (doc: SanityDocument) => {
        const paths = [
          `/${doc.language}/log`,
          `/${doc.language}/log/${doc.slug?.current}`
        ]
        
        // 查找所属的 devCollection 路径
        const parentCollections = await ContentRelationshipMapper.getParentDevCollections(doc._id)
        parentCollections.forEach(collection => {
          paths.push(`/${doc.language}/dev/${collection.slug?.current}`)
        })
        
        return paths
      }
    },
    
    devCollection: {
      directTags: (doc: SanityDocument) => [
        'dev-collections',
        `dev-collection:${doc._id}`,
        `dev-collection:${doc.slug?.current}`,
        'dev-collection-list'
      ],
      
      indirectTags: async (doc: SanityDocument) => {
        const tags: string[] = []
        
        // 查找此集合包含的所有 logs
        if (doc.logs && Array.isArray(doc.logs)) {
          const logIds = doc.logs
            .map((log: { _ref?: string }) => log._ref)
            .filter((id): id is string => Boolean(id))
          if (logIds.length > 0) {
            // 获取这些 logs 的语言信息
            const logsData = await ContentRelationshipMapper.getLogsByIds(logIds)
            const languages = [...new Set(logsData.map(log => log.language))]
            
            languages.forEach(lang => {
              tags.push(`dev-collections:${lang}`)
            })
            
            tags.push(
              ...logIds.map((id: string) => `log:${id}`),
              'log-collection-mapping',
              'collection-logs'
            )
          }
        }
        
        return tags
      },
      
      affectedPaths: async (doc: SanityDocument) => {
        const paths: string[] = []
        
        // 获取此集合包含的 logs 的语言
        if (doc.logs && Array.isArray(doc.logs)) {
          const logIds = doc.logs
            .map((log: { _ref?: string }) => log._ref)
            .filter((id): id is string => Boolean(id))
          if (logIds.length > 0) {
            const logsData = await ContentRelationshipMapper.getLogsByIds(logIds)
            const languages = [...new Set(logsData.map(log => log.language))]
            
            languages.forEach(lang => {
              paths.push(
                `/${lang}/dev`,
                `/${lang}/dev/${doc.slug?.current}`
              )
            })
          }
        }
        
        return paths
      }
    },
    
    author: {
      directTags: (doc: SanityDocument) => [
        'authors',
        `author:${doc._id}`,
        `author:${doc.slug?.current}`,
        'author-data'
      ],
      
      indirectTags: async (doc: SanityDocument) => {
        // 查找此作者的所有文章
        const authorLogs = await ContentRelationshipMapper.getLogsByAuthor(doc._id)
        const tags: string[] = []
        
        authorLogs.forEach(log => {
          tags.push(
            `log:${log._id}`,
            `log:${log.slug?.current}`,
            `logs:${log.language}`
          )
        })
        
        return tags
      },
      
      affectedPaths: async (doc: SanityDocument) => {
        const paths = [
          '/about',
          '/zh/about',
          '/en/about'
        ]
        
        // 查找此作者的所有文章路径
        const authorLogs = await ContentRelationshipMapper.getLogsByAuthor(doc._id)
        authorLogs.forEach(log => {
          paths.push(`/${log.language}/log/${log.slug?.current}`)
        })
        
        return paths
      }
    }
  }
  
  /**
   * 获取文档变更影响的所有缓存标签
   */
  static async getAffectedCacheTags(type: string, doc: SanityDocument): Promise<string[]> {
    const relationship = this.RELATIONSHIPS[type as keyof typeof this.RELATIONSHIPS]
    if (!relationship) {
      logger.warn('ContentRelationshipMapper', `Unknown document type: ${type}`)
      return []
    }
    
    try {
      const directTags = relationship.directTags(doc)
      const indirectTags = await relationship.indirectTags(doc)
      
      const allTags = [...directTags, ...indirectTags]
      
      // 去重并过滤空值
      const uniqueTags = [...new Set(allTags.filter(Boolean))]
      
      logger.info('ContentRelationshipMapper', `Generated ${uniqueTags.length} cache tags for ${type}:${doc._id}`, {
        documentId: doc._id,
        documentType: type,
        tags: uniqueTags
      })
      
      return uniqueTags
    } catch (error) {
      logger.error('ContentRelationshipMapper', `Error generating cache tags for ${type}:${doc._id}`, error as Error)
      return []
    }
  }
  
  /**
   * 获取文档变更影响的所有路径
   */
  static async getAffectedPaths(type: string, doc: SanityDocument): Promise<string[]> {
    const relationship = this.RELATIONSHIPS[type as keyof typeof this.RELATIONSHIPS]
    if (!relationship) {
      return []
    }
    
    try {
      const paths = await relationship.affectedPaths(doc)
      const uniquePaths = [...new Set(paths.filter(Boolean))]
      
      logger.info('ContentRelationshipMapper', `Generated ${uniquePaths.length} affected paths for ${type}:${doc._id}`, {
        documentId: doc._id,
        documentType: type,
        paths: uniquePaths
      })
      
      return uniquePaths
    } catch (error) {
      logger.error('ContentRelationshipMapper', `Error generating affected paths for ${type}:${doc._id}`, error as Error)
      return []
    }
  }
  
  /**
   * 查找包含指定照片的集合
   */
  private static async getParentCollections(photoId: string): Promise<Array<{ _id: string; slug?: { current: string } }>> {
    const query = groq`*[_type == "collection" && $photoId in photos[]._ref] {
      _id,
      slug
    }`
    
    try {
      return await sanityServerClient.fetch(query, { photoId })
    } catch (error) {
      logger.error('ContentRelationshipMapper', `Error fetching parent collections for photo ${photoId}`, error as Error)
      return []
    }
  }
  
  /**
   * 查找包含指定 log 的 devCollection
   */
  private static async getParentDevCollections(logId: string): Promise<Array<{ _id: string; slug?: { current: string } }>> {
    const query = groq`*[_type == "devCollection" && $logId in logs[]._ref] {
      _id,
      slug
    }`
    
    try {
      return await sanityServerClient.fetch(query, { logId })
    } catch (error) {
      logger.error('ContentRelationshipMapper', `Error fetching parent dev collections for log ${logId}`, error as Error)
      return []
    }
  }
  
  /**
   * 根据 ID 列表获取 logs 信息
   */
  private static async getLogsByIds(logIds: string[]): Promise<Array<{ _id: string; language: string; slug?: { current: string } }>> {
    const query = groq`*[_type == "log" && _id in $logIds] {
      _id,
      language,
      slug
    }`
    
    try {
      return await sanityServerClient.fetch(query, { logIds })
    } catch (error) {
      logger.error('ContentRelationshipMapper', `Error fetching logs by IDs`, error as Error)
      return []
    }
  }
  
  /**
   * 获取指定作者的所有文章
   */
  private static async getLogsByAuthor(authorId: string): Promise<Array<{ _id: string; language: string; slug?: { current: string } }>> {
    const query = groq`*[_type == "log" && author._ref == $authorId] {
      _id,
      language,
      slug
    }`
    
    try {
      return await sanityServerClient.fetch(query, { authorId })
    } catch (error) {
      logger.error('ContentRelationshipMapper', `Error fetching logs by author ${authorId}`, error as Error)
      return []
    }
  }
}
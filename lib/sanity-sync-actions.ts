'use server'

import { revalidatePath } from 'next/cache'
// import { toPlainText } from '@portabletext/react' // 暂时不需要
import { markdownToPortableText } from '@/lib/markdown-to-portable-text'
import { sanityServerClientWithToken, sanityServerClient } from '@/lib/sanity-server'
import { isAdmin } from '@/lib/admin-actions'

// 测试Sanity客户端连接
export async function testSanityConnection() {
  try {
    // 测试Sanity连接
    const client = sanityServerClient

    // 测试简单查询 - 获取一个文档来验证连接
    const testQuery = '*[0...1]{_id, _type}'
    const testResult = await client.fetch(testQuery)

    // 测试获取所有文档类型
    const typesQuery = 'array::unique(*[]._type)'
    const types = await client.fetch(typesQuery)

    return {
      success: true,
      message: 'Sanity连接测试成功',
      data: {
        testResult,
        types
      }
    }
  } catch (error) {
    console.error('❌ Sanity连接测试失败:', error)
    return {
      success: false,
      message: `Sanity连接测试失败: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.stack : String(error)
    }
  }
}

interface SyncRequest {
  markdownContent: string
  documentType: string
  documentId?: string
  documentSlug?: string
  targetField: string
}

interface SyncResult {
  success: boolean
  message: string
  updatedBlocks?: number
}

// 同步Markdown内容到Sanity
export async function syncToSanity(data: SyncRequest): Promise<SyncResult> {
  try {
    // 验证管理员权限
    const isAdminUser = await isAdmin()
    if (!isAdminUser) {
      return {
        success: false,
        message: '权限不足：需要管理员权限才能执行此操作',
      }
    }

    const {
      markdownContent,
      documentType,
      documentId,
      documentSlug,
      targetField,
    } = data

    // 验证必需参数
    if (!markdownContent?.trim()) {
      return {
        success: false,
        message: 'Markdown内容不能为空',
      }
    }

    if (!documentType || !targetField) {
      return {
        success: false,
        message: '文档类型和目标字段不能为空',
      }
    }

    if (!documentId && !documentSlug) {
      return {
        success: false,
        message: '必须提供文档ID或文档slug',
      }
    }

    // 转换Markdown为Portable Text
    let portableTextContent
    try {
      portableTextContent = await markdownToPortableText(markdownContent)
    } catch (error) {
      console.error('❌ Markdown转换失败，使用简单文本格式:', error)
      // 如果转换失败，使用简单的文本内容作为后备
      portableTextContent = [{
        _type: 'block',
        _key: 'fallback-key',
        style: 'normal',
        children: [{
          _type: 'span',
          _key: 'fallback-span',
          text: markdownContent,
          marks: []
        }]
      }]
    }

    if (!portableTextContent || portableTextContent.length === 0) {
      return {
        success: false,
        message: 'Markdown转换失败，生成的内容为空',
      }
    }

    const client = sanityServerClientWithToken

    // 确定目标文档ID
    let targetDocumentId = documentId

    if (!targetDocumentId && documentSlug) {
      // 通过类型和slug查找文档
      const query = `*[_type == $type && slug.current == $slug][0]._id`
      const foundId = await client.fetch(query, {
        type: documentType,
        slug: documentSlug,
      })

      if (!foundId) {
        return {
          success: false,
          message: `未找到类型为"${documentType}"、slug为"${documentSlug}"的文档`,
        }
      }

      targetDocumentId = foundId
    }

    if (!targetDocumentId) {
      return {
        success: false,
        message: '无法确定目标文档ID',
      }
    }

    // 更新文档
    const updateData = {
      [targetField]: portableTextContent,
    }

    await client
      .patch(targetDocumentId)
      .set(updateData)
      .commit()

    // 重新验证相关页面缓存
    revalidatePath('/[lang]/admin/markdown-converter', 'page')
    revalidatePath('/[lang]/logs', 'page')

    return {
      success: true,
      message: `成功同步到Sanity！更新了${portableTextContent.length}个内容块`,
      updatedBlocks: portableTextContent.length,
    }
  } catch (error) {
    console.error('Sanity同步失败:', error)
    return {
      success: false,
      message:
        error instanceof Error ? error.message : '同步过程中发生未知错误',
    }
  }
}



import { cache } from 'react'
import { PortableTextDocumentConfig, getSupportedDocumentTypes } from './sanity-portable-text-config'

/**
 * 获取所有在配置文件中定义的、支持Portable Text的文档类型及其字段。
 * 这个经过优化的函数取代了之前会导致N+1查询的实现。
 * 它现在直接从一个可维护的配置文件中读取Schema定义，并通过一次轻量查询来验证文档的存在性。
 * @returns 返回一个包含文档类型配置的数组，这些类型被确认为系统中实际存在的。
 */
export const getDocumentTypes = cache(
  async (): Promise<{
    success: boolean
    error?: string
    data: PortableTextDocumentConfig[]
  }> => {
    try {
      const isAdminUser = await isAdmin()
      if (!isAdminUser) {
        return {
          success: false,
          error: '权限不足：需要管理员权限才能执行此操作',
          data: [],
        }
      }

      // 1. 从配置文件获取支持的文档类型定义
      const supportedTypesConfig = getSupportedDocumentTypes()
      const supportedTypeNames = supportedTypesConfig.map(t => t.name)

      // 2. 一次性查询所有相关类型的现有文档的_id和_type
      // 这是一个非常轻量级的查询，用于确认哪些文档类型在数据库中实际存在内容。
      const query = `*[_type in $supportedTypeNames] {_id, _type}`
      const existingDocuments = await sanityServerClient.fetch<
        { _id: string; _type: string }[]
      >(query, { supportedTypeNames })

      // 3. 确定哪些文档类型至少有一个文档存在
      const existingTypeNames = new Set(existingDocuments.map(doc => doc._type))

      // 4. 过滤配置，只返回数据库中实际存在的文档类型
      const finalDocumentTypes = supportedTypesConfig.filter(typeConfig =>
        existingTypeNames.has(typeConfig.name)
      )

      return {
        success: true,
        data: finalDocumentTypes,
      }
    } catch (error) {
      console.error('Error in getDocumentTypes:', error)
      return {
        success: false,
        error: '获取文档类型失败',
        data: [],
      }
    }
  }
)

// 获取指定类型的文档列表（支持分页和搜索）
export async function getDocumentsByType(
  documentType: string,
  options: {
    limit?: number;
    offset?: number;
    searchTerm?: string;
  } = {}
) {
  try {
    const isAdminUser = await isAdmin()
    if (!isAdminUser) {
      return {
        success: false,
        error: '权限不足：需要管理员权限才能执行此操作',
        data: [],
        total: 0,
        hasMore: false,
      }
    }

    if (!documentType) {
      return {
        success: false,
        error: '文档类型不能为空',
        data: [],
        total: 0,
        hasMore: false,
      }
    }

    const { limit = 6, offset = 0, searchTerm } = options
    const client = sanityServerClient

    // 构建查询条件
    let filterCondition = `_type == $type`
    const params: Record<string, unknown> = { type: documentType }

    // 添加搜索条件
    if (searchTerm && searchTerm.trim()) {
      filterCondition += ` && (title match $searchTerm || slug.current match $searchTerm)`
      params.searchTerm = `*${searchTerm.trim()}*`
    }

    // 获取总数
    const countQuery = `count(*[${filterCondition}])`
    const total = await client.fetch(countQuery, params)

    // 获取分页数据，按创建时间倒序排列
    const query = `*[${filterCondition}] | order(_createdAt desc) [${offset}...${offset + limit}]`
    const projection = `{
      _id,
      _type,
      title,
      slug,
      _createdAt,
      "isDraft": _id in path("drafts.**")
    }`

    const documents = await client.fetch(`${query}${projection}`, params)

    const hasMore = offset + limit < total

    return {
      success: true,
      data: documents,
      total,
      hasMore,
    }
  } catch (error) {
    console.error('获取文档列表失败:', error)
    return {
      success: false,
      error: '获取文档列表失败',
      data: [],
      total: 0,
      hasMore: false,
    }
  }
}
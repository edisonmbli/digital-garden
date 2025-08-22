/**
 * 定义支持Portable Text的文档类型及其字段配置
 * 这个配置文件用于Markdown转换器功能，指定哪些文档类型的哪些字段可以接收Portable Text内容
 */
export const portableTextConfig = {
  // 开发日志文档
  log: {
    name: 'log',
    title: '开发日志',
    fields: [
      {
        name: 'content',
        title: '内容',
        type: 'portableText',
      },
    ],
  },
  // 作者文档
  author: {
    name: 'author',
    title: '作者',
    fields: [
      {
        name: 'zh',
        title: '中文简介',
        type: 'portableText',
      },
      {
        name: 'en',
        title: '英文简介',
        type: 'portableText',
      },
    ],
  },
} as const

// 类型定义
export type PortableTextDocumentType = keyof typeof portableTextConfig
export type PortableTextField = {
  name: string
  title: string
  type: 'portableText'
}
export type PortableTextDocumentConfig = {
  name: string
  title: string
  fields: PortableTextField[]
}

// 获取所有支持的文档类型配置
export function getSupportedDocumentTypes(): PortableTextDocumentConfig[] {
  // 使用JSON深拷贝移除`as const`带来的readonly属性，确保类型匹配
  return JSON.parse(JSON.stringify(Object.values(portableTextConfig)))
}
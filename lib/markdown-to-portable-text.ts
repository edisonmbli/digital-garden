// lib/markdown-to-portable-text.ts
// Markdown到Portable Text转换器
// 支持将Markdown文件转换为Sanity Portable Text格式

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import type { Root, Paragraph, Heading, Code, Blockquote, List, Table, Text, ListItem, TableRow, TableCell, PhrasingContent } from 'mdast'
import type { PortableTextBlock, PortableTextSpan } from '@portabletext/types'
import { nanoid } from 'nanoid'

// 扩展的Portable Text块类型
interface PortableTextBlockExtended extends Omit<PortableTextBlock, 'children'> {
  _type: string
  _key: string
  style?: string
  level?: number
  listItem?: string
  children: PortableTextSpan[]
}

// 代码块类型
interface CodeBlock {
  _type: 'codeBlock'
  _key: string
  language?: string
  filename?: string
  code: string
}

// 高亮块类型
interface HighlightBlock {
  _type: 'highlightBlock'
  _key: string
  type: 'info' | 'warning' | 'error' | 'success' | 'note'
  title?: string
  content: PortableTextBlockExtended[]
}

// 图片块类型
interface ImageBlock {
  _type: 'image'
  _key: string
  asset: {
    _ref: string
    _type: 'reference'
  }
  alt?: string
  caption?: string
}

// 表格块类型
interface TableBlock {
  _type: 'table'
  _key: string
  rows: Array<{
    _key: string
    _type: 'tableRow'
    cells: Array<{
      _key: string
      _type: 'tableCell'
      content: PortableTextBlockExtended[]
    }>
  }>
}

interface SeparatorBlock {
  _type: 'separator'
  _key: string
}

export type PortableTextElement = PortableTextBlockExtended | CodeBlock | HighlightBlock | ImageBlock | TableBlock | SeparatorBlock

/**
 * 生成唯一的key
 */
function generateKey(): string {
  return nanoid()
}

/**
 * 转换内联节点为Portable Text spans
 */
function convertInlineNode(node: PhrasingContent): PortableTextSpan[] {
  switch (node.type) {
    case 'text':
      return [{
        _type: 'span',
        _key: generateKey(),
        text: node.value,
        marks: []
      }]
    
    case 'strong':
      const strongSpans: PortableTextSpan[] = []
      for (const child of node.children || []) {
        const childSpans = convertInlineNode(child)
        for (const span of childSpans) {
          strongSpans.push({
            ...span,
            marks: [...(span.marks || []), 'strong']
          })
        }
      }
      return strongSpans
    
    case 'emphasis':
      const emSpans: PortableTextSpan[] = []
      for (const child of node.children || []) {
        const childSpans = convertInlineNode(child)
        for (const span of childSpans) {
          emSpans.push({
            ...span,
            marks: [...(span.marks || []), 'em']
          })
        }
      }
      return emSpans
    
    case 'inlineCode':
      return [{
        _type: 'span',
        _key: generateKey(),
        text: node.value,
        marks: ['code']
      }]
    
    case 'delete':
      const deleteSpans: PortableTextSpan[] = []
      for (const child of node.children || []) {
        const childSpans = convertInlineNode(child)
        for (const span of childSpans) {
          deleteSpans.push({
            ...span,
            marks: [...(span.marks || []), 'strike-through']
          })
        }
      }
      return deleteSpans
    
    case 'link':
      const linkSpans: PortableTextSpan[] = []
      for (const child of node.children || []) {
        const childSpans = convertInlineNode(child)
        for (const span of childSpans) {
          linkSpans.push({
            ...span,
            marks: [...(span.marks || []), 'link']
          })
        }
      }
      return linkSpans
    
    default:
      return [{
        _type: 'span',
        _key: generateKey(),
        text: '',
        marks: []
      }]
  }
}



/**
 * 转换段落节点
 */
function convertParagraphNode(node: Paragraph): PortableTextBlockExtended {
  const children: PortableTextSpan[] = []
  
  for (const child of node.children || []) {
    children.push(...convertInlineNode(child))
  }
  
  return {
    _type: 'block',
    _key: generateKey(),
    style: 'normal',
    children
  }
}

/**
 * 转换标题节点
 */
function convertHeadingNode(node: Heading): PortableTextBlockExtended {
  const children: PortableTextSpan[] = []
  
  for (const child of node.children || []) {
    children.push(...convertInlineNode(child))
  }
  
  return {
    _type: 'block',
    _key: generateKey(),
    style: `h${node.depth}`,
    level: node.depth,
    children
  }
}

/**
 * 转换代码块节点
 */
function convertCodeBlockNode(node: Code): CodeBlock {
  return {
    _type: 'codeBlock',
    _key: generateKey(),
    language: node.lang || undefined,
    code: node.value
  }
}

/**
 * 转换引用块节点
 */
function convertBlockquoteNode(node: Blockquote): PortableTextBlockExtended {
  const children: PortableTextSpan[] = []
  
  for (const child of node.children || []) {
    if (child.type === 'paragraph') {
      for (const grandChild of child.children || []) {
        children.push(...convertInlineNode(grandChild))
      }
    }
  }
  
  return {
    _type: 'block',
    _key: generateKey(),
    style: 'blockquote',
    children
  }
}

/**
 * 转换列表节点
 */
function convertListNode(node: List): PortableTextBlockExtended[] {
  const listType = node.ordered ? 'number' : 'bullet'
  
  return node.children?.map((listItem: ListItem): PortableTextBlockExtended => {
    const children: PortableTextSpan[] = []
    
    for (const child of listItem.children || []) {
      if (child.type === 'paragraph') {
        for (const grandChild of (child as Paragraph).children || []) {
          children.push(...convertInlineNode(grandChild))
        }
      }
    }
    
    return {
      _type: 'block',
      _key: generateKey(),
      style: 'normal',
      listItem: listType,
      children
    }
  }) || []
}

/**
 * 转换表格节点
 */
function convertTableNode(node: Table): TableBlock {
  const rows = node.children?.map((row: TableRow) => ({
    _key: generateKey(),
    _type: 'tableRow' as const,
    cells: row.children?.map((cell: TableCell) => ({
      _key: generateKey(),
      _type: 'tableCell' as const,
      content: cell.children?.map((child): PortableTextBlockExtended => {
         // TableCell的children都是PhrasingContent，需要包装成段落
         return {
           _type: 'block',
           _key: generateKey(),
           style: 'normal',
           children: convertInlineNode(child)
         }
       }) || []
    })) || []
  })) || []
  
  return {
    _type: 'table',
    _key: generateKey(),
    rows
  }
}

/**
 * 检测并转换高亮块（基于特殊语法）
 */
function detectHighlightBlock(node: Blockquote): HighlightBlock | null {
  if (node.type !== 'blockquote') return null
  
  const firstChild = node.children?.[0]
  if (firstChild?.type === 'paragraph') {
    const textContent = firstChild.children?.find((child): child is Text => child.type === 'text')?.value || ''
    
    // 检测高亮块语法：> **类型**: 内容
    const highlightMatch = textContent.match(/^\*\*(info|warning|error|success|note)\*\*:?\s*(.*)$/i)
    if (highlightMatch) {
      const [, type, title] = highlightMatch
      
      return {
        _type: 'highlightBlock',
        _key: generateKey(),
        type: type.toLowerCase() as 'info' | 'warning' | 'error' | 'success' | 'note',
        title: title || undefined,
        content: [convertBlockquoteNode(node)]
      }
    }
  }
  
  return null
}

/**
 * 转换MDAST节点为Portable Text
 */
function convertNode(node: Root['children'][0]): PortableTextElement[] {
  switch (node.type) {
    case 'paragraph':
      return [convertParagraphNode(node)]
    
    case 'heading':
      return [convertHeadingNode(node)]
    
    case 'code':
      return [convertCodeBlockNode(node)]
    
    case 'blockquote':
      // 先检测是否为高亮块
      const highlightBlock = detectHighlightBlock(node)
      if (highlightBlock) {
        return [highlightBlock]
      }
      return [convertBlockquoteNode(node)]
    
    case 'list':
      return convertListNode(node)
    
    case 'table':
      return [convertTableNode(node)]
    
    case 'thematicBreak':
      return [{
        _type: 'separator',
        _key: generateKey()
      } as SeparatorBlock]
    
    default:
      // 处理未知节点类型
      return [{
        _type: 'block',
        _key: generateKey(),
        style: 'normal',
        children: [{
          _type: 'span',
          _key: generateKey(),
          text: '',
          marks: []
        }]
      }]
  }
}

/**
 * 主要转换函数：将Markdown转换为Portable Text
 */
export async function markdownToPortableText(markdown: string): Promise<PortableTextElement[]> {
  try {
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
    
    const tree = processor.parse(markdown) as Root
    const result: PortableTextElement[] = []
    
    for (const node of tree.children) {
      result.push(...convertNode(node))
    }
    
    return result
  } catch (error) {
    console.error('Markdown转换失败:', error)
    throw new Error('Markdown转换失败')
  }
}

/**
 * 验证转换结果
 */
export function validatePortableText(portableText: PortableTextElement[]): boolean {
  try {
    for (const block of portableText) {
      // 检查必需字段
      if (!block._type || !block._key) {
        return false
      }
      
      // 检查块类型特定的字段
      if (block._type === 'block') {
        const blockElement = block as PortableTextBlockExtended
        if (!blockElement.children || !Array.isArray(blockElement.children)) {
          return false
        }
        
        // 验证children
        for (const child of blockElement.children) {
          if (!child._type || !child._key || typeof child.text !== 'string') {
            return false
          }
        }
      }
    }
    
    return true
  } catch {
    return false
  }
}

/**
 * 提取标题信息
 */
export function extractHeadings(portableText: PortableTextElement[]): Array<{
  id: string
  text: string
  level: number
}> {
  const headings: Array<{ id: string; text: string; level: number }> = []
  
  for (const block of portableText) {
    if (block._type === 'block') {
      const blockElement = block as PortableTextBlockExtended
      if (blockElement.style?.startsWith('h') && blockElement.level) {
        const text = blockElement.children
          ?.map(child => child.text)
          .join('') || ''
        
        headings.push({
          id: generateHeadingId(text),
          text,
          level: blockElement.level
        })
      }
    }
  }
  
  return headings
}

/**
 * 生成标题ID
 */
function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * 获取转换统计信息
 */
export function getConversionStats(portableText: PortableTextElement[]): {
  totalBlocks: number
  blockTypes: Record<string, number>
  headings: number
  codeBlocks: number
  images: number
  tables: number
} {
  const stats = {
    totalBlocks: portableText.length,
    blockTypes: {} as Record<string, number>,
    headings: 0,
    codeBlocks: 0,
    images: 0,
    tables: 0
  }
  
  for (const block of portableText) {
    // 统计块类型
    stats.blockTypes[block._type] = (stats.blockTypes[block._type] || 0) + 1
    
    // 统计特定类型
    if (block._type === 'block') {
      const blockElement = block as PortableTextBlockExtended
      if (blockElement.style?.startsWith('h')) {
        stats.headings++
      }
    } else if (block._type === 'codeBlock') {
      stats.codeBlocks++
    } else if (block._type === 'image') {
      stats.images++
    } else if (block._type === 'table') {
      stats.tables++
    }
  }
  
  return stats
}
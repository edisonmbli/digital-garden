// app/ui/portable-text-renderer.tsx
'use client'

import React, { useEffect } from 'react'
import { PortableText, PortableTextComponents } from '@portabletext/react'
import { PortableTextBlock } from '@portabletext/types'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  extractSanityImageId,
  generateSecureImageUrl,
} from '@/lib/secure-image-loader'
import '@/app/ui/code-block-theme.css'
import { Highlight, themes } from 'prism-react-renderer'
import { useTheme } from 'next-themes'
import { PortableTextElement } from '@/lib/markdown-to-portable-text'

// Hook to get code theme based on current theme
function useCodeTheme() {
  const { theme } = useTheme()
  return theme === 'dark' ? themes.vsDark : themes.github
}

interface PortableTextRendererProps {
  content: PortableTextElement[] | PortableTextBlock[]
  onHeadingsExtracted?: (headings: HeadingItem[]) => void
}

export interface HeadingItem {
  id: string
  text: string
  level: number
}

// 自定义 Portable Text 组件
const components: PortableTextComponents = {
  block: {
    h1: ({ children, value }) => {
      const id = generateHeadingId(value)
      return (
        <h1
          id={id}
          className="group relative scroll-mt-20 text-display-sm sm:text-display-md font-normal tracking-tight mt-16 mb-3 [&:first-child]:mt-0 "
        >
          {children}
        </h1>
      )
    },
    h2: ({ children, value }) => {
      const id = generateHeadingId(value)
      return (
        <h2
          id={id}
          className="group relative scroll-mt-20 text-body-base sm:text-display-sm font-semibold tracking-tight mt-14 mb-2 [&:first-child]:mt-0  pl-4 sm:pl-6"
        >
          {/* 前缀图标 - 向左突出并居中对齐 */}
          <span
            className="absolute -left-2 sm:-left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 select-none transition-colors duration-200 group-hover:text-slate-600 dark:group-hover:text-slate-300"
            aria-hidden="true"
          >
            <svg
              className="w-6 h-6 sm:w-8 sm:h-8"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
            </svg>
          </span>
          {children}
        </h2>
      )
    },
    h3: ({ children, value }) => {
      const id = generateHeadingId(value)
      return (
        <h3
          id={id}
          className="scroll-mt-20 text-body-sm sm:text-body-lg font-semibold tracking-tight mt-12 mb-2 [&:first-child]:mt-0"
        >
          {children}
        </h3>
      )
    },
    h4: ({ children, value }) => {
      const id = generateHeadingId(value)
      return (
        <h4
          id={id}
          className="scroll-mt-20 text-body-sm sm:text-body-md font-semibold tracking-tight mt-10 mb-1 [&:first-child]:mt-0"
        >
          {children}
        </h4>
      )
    },
    h5: ({ children, value }) => {
      const id = generateHeadingId(value)
      return (
        <h5
          id={id}
          className="scroll-mt-20 text-caption-xs sm:text-body-sm font-semibold tracking-tight mt-8 mb-1 [&:first-child]:mt-0"
        >
          {children}
        </h5>
      )
    },
    h6: ({ children, value }) => {
      const id = generateHeadingId(value)
      return (
        <h6
          id={id}
          className="scroll-mt-20 text-caption-xs sm:text-body-sm font-semibold tracking-tight mt-6 mb-1 [&:first-child]:mt-0"
        >
          {children}
        </h6>
      )
    },
    normal: ({ children }) => {
      return (
        <p className="text-body-base lg:text-body-sm leading-6 [&:not(:first-child)]:mt-1">
          {children}
        </p>
      )
    },
    blockquote: ({ children }) => (
      <blockquote className="relative border-l-4 border-blue-300/60 dark:border-blue-400/80 bg-slate-200/40 dark:bg-zinc-400/20 pl-6 pr-4 py-2 my-2 rounded-r-lg">
        <div className="absolute top-2 left-2 text-slate-400 dark:text-slate-500 text-body-lg leading-none">
          &ldquo;
        </div>
        <div className="italic text-slate-700 dark:text-slate-300 font-light text-body-sm">
          {children}
        </div>
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="my-2 ml-2 space-y-1 list-disc marker:text-slate-400 dark:marker:text-slate-500">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="my-2 ml-2 space-y-1 list-decimal marker:text-slate-400 dark:marker:text-slate-500 marker:font-medium">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => (
      <li className="text-body-base lg:text-body-sm text-slate-700 dark:text-slate-300 leading-relaxed pl-2">
        {children}
      </li>
    ),
    number: ({ children }) => (
      <li className="text-body-base lg:text-body-sm text-slate-700 dark:text-slate-300 leading-relaxed pl-2">
        {children}
      </li>
    ),
  },
  marks: {
    // 基础装饰器
    strong: ({ children }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    code: ({ children }) => (
      <code className="unified-inline-code px-[0.3rem] py-[0.2rem] font-mono text-code-sm font-semibold rounded border">
        {children}
      </code>
    ),
    underline: ({ children }) => <u className="underline">{children}</u>,
    'strike-through': ({ children }) => (
      <s className="line-through">{children}</s>
    ),

    // 自定义高亮标记
    highlight: ({ children }) => (
      <mark className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30  dark:text-yellow-200 px-1.5 py-0.5 rounded-md font-medium">
        {children}
      </mark>
    ),
    important: ({ children }) => (
      <span className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-md font-medium border border-red-200 dark:border-red-800">
        {children}
      </span>
    ),

    // 链接注释
    link: ({ children, value }) => {
      const target = (value?.href || '').startsWith('http')
        ? '_blank'
        : undefined
      const isExternal = target === '_blank'

      return (
        <a
          href={value?.href}
          target={target}
          rel={target === '_blank' ? 'noopener noreferrer' : undefined}
          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-blue-300 dark:decoration-blue-600 decoration-2 underline-offset-2 hover:decoration-blue-500 dark:hover:decoration-blue-400 transition-colors duration-200"
        >
          {children}
          {isExternal && (
            <svg
              className="w-3 h-3 ml-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          )}
        </a>
      )
    },

    // 文字颜色注释
    color: ({ children, value }) => {
      const colorClasses = {
        red: 'text-red-600 dark:text-red-400',
        blue: 'text-blue-600 dark:text-blue-400',
        green: 'text-green-600 dark:text-green-400',
        orange: 'text-orange-600 dark:text-orange-400',
        purple: 'text-purple-600 dark:text-purple-400',
        gray: 'text-gray-600 dark:text-gray-400',
      }
      return (
        <span
          className={
            colorClasses[value?.value as keyof typeof colorClasses] || ''
          }
        >
          {children}
        </span>
      )
    },

    // 字体大小注释
    fontSize: ({ children, value }) => {
      const sizeClasses = {
        small: 'text-body-sm',
        normal: 'text-body-base',
        large: 'text-body-lg',
        xl: 'text-display-sm',
      }
      return (
        <span
          className={
            sizeClasses[value?.value as keyof typeof sizeClasses] || ''
          }
        >
          {children}
        </span>
      )
    },
  },
  types: {
    // 表格
    markdownTable: ({
      value,
    }: {
      value: {
        markdownContent: string
      }
    }) => {
      // 解析表格单元格中的 Markdown 内容
      const parseMarkdownCell = (cellContent: string): React.ReactNode => {
        if (!cellContent) return cellContent

        // 解析链接 [text](url)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
        const parts: React.ReactNode[] = []
        let lastIndex = 0
        let match

        while ((match = linkRegex.exec(cellContent)) !== null) {
          // 添加链接前的文本
          if (match.index > lastIndex) {
            const beforeText = cellContent.slice(lastIndex, match.index)
            parts.push(parseInlineMarkdown(beforeText))
          }

          // 添加链接
          parts.push(
            <a
              key={match.index}
              href={match[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
            >
              {parseInlineMarkdown(match[1])}
            </a>
          )

          lastIndex = linkRegex.lastIndex
        }

        // 添加剩余文本
        if (lastIndex < cellContent.length) {
          parts.push(parseInlineMarkdown(cellContent.slice(lastIndex)))
        }

        return parts.length > 0 ? parts : parseInlineMarkdown(cellContent)
      }

      // 解析内联 Markdown 格式（粗体、斜体、代码等）
      const parseInlineMarkdown = (text: string): React.ReactNode => {
        if (!text) return text

        // 解析粗体 **text**
        const boldRegex = /\*\*([^*]+)\*\*/g
        let result: React.ReactNode = text

        if (boldRegex.test(text)) {
          const parts: React.ReactNode[] = []
          let lastIndex = 0
          boldRegex.lastIndex = 0 // 重置正则表达式
          let match

          while ((match = boldRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
              parts.push(text.slice(lastIndex, match.index))
            }
            parts.push(
              <strong key={match.index} className="font-semibold">
                {match[1]}
              </strong>
            )
            lastIndex = boldRegex.lastIndex
          }

          if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex))
          }

          result = parts
        }

        // 如果结果是数组，需要进一步处理斜体和代码
        if (Array.isArray(result)) {
          return result.map((part, index) => {
            if (typeof part === 'string') {
              return parseItalicAndCode(part, `${index}`)
            }
            return part
          })
        }

        return parseItalicAndCode(result as string, '0')
      }

      // 解析斜体和代码
      const parseItalicAndCode = (
        text: string,
        keyPrefix: string
      ): React.ReactNode => {
        if (!text) return text

        // 解析代码 `code`
        const codeRegex = /`([^`]+)`/g
        const parts: React.ReactNode[] = []
        let lastIndex = 0
        let match

        while ((match = codeRegex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            const beforeText = text.slice(lastIndex, match.index)
            parts.push(parseItalic(beforeText, `${keyPrefix}-${match.index}`))
          }
          parts.push(
            <code
              key={`${keyPrefix}-code-${match.index}`}
              className="unified-inline-code px-[0.3rem] py-[0.2rem] font-mono text-code-sm font-semibold rounded border"
            >
              {match[1]}
            </code>
          )
          lastIndex = codeRegex.lastIndex
        }

        if (lastIndex < text.length) {
          parts.push(parseItalic(text.slice(lastIndex), `${keyPrefix}-end`))
        }

        return parts.length > 0 ? parts : parseItalic(text, keyPrefix)
      }

      // 解析斜体 *text*
      const parseItalic = (
        text: string,
        keyPrefix: string
      ): React.ReactNode => {
        if (!text) return text

        const italicRegex = /\*([^*]+)\*/g
        const parts: React.ReactNode[] = []
        let lastIndex = 0
        let match

        while ((match = italicRegex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index))
          }
          parts.push(
            <em key={`${keyPrefix}-italic-${match.index}`} className="italic">
              {match[1]}
            </em>
          )
          lastIndex = italicRegex.lastIndex
        }

        if (lastIndex < text.length) {
          parts.push(text.slice(lastIndex))
        }

        return parts.length > 0 ? parts : text
      }

      // 解析 markdown 表格并渲染为 HTML 表格
      const lines = value.markdownContent.trim().split('\n')
      const headerLine = lines[0]
      const separatorLine = lines[1]
      const dataLines = lines.slice(2)

      if (!headerLine || !separatorLine) {
        return (
          <div className="my-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300">
            表格格式错误
          </div>
        )
      }

      // 解析表头
      const headers = headerLine
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell !== '')

      // 解析数据行
      const rows = dataLines
        .map((line) =>
          line
            .split('|')
            .map((cell) => cell.trim())
            .filter((cell) => cell !== '')
        )
        .filter((row) => row.length > 0)

      return (
        <div className="my-2 overflow-x-auto">
          <table className="min-w-full border border-slate-200 dark:border-zinc-700 rounded-sm overflow-hidden">
            <thead className="bg-slate-50 dark:bg-zinc-800">
              <tr>
                {headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-4 py-3 text-left text-body-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-zinc-700"
                  >
                    {parseMarkdownCell(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-600/80 divide-y divide-slate-200 dark:divide-zinc-700">
              {rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-4 py-3 text-body-sm text-slate-700 dark:text-slate-300"
                    >
                      {parseMarkdownCell(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    },

    // 图片
    image: ({ value }) => {
      // 提取 Sanity asset ID 并生成安全 URL
      let imageUrl: string | undefined

      if (value.asset) {
        let imageId: string | null = null

        if (
          typeof value.asset === 'object' &&
          'asset' in value.asset &&
          value.asset.asset
        ) {
          imageId = value.asset.asset._ref
        } else if (typeof value.asset === 'object' && '_ref' in value.asset) {
          imageId = value.asset._ref
        } else if (value.asset.url) {
          imageId = extractSanityImageId(value.asset.url)
        }

        if (imageId) {
          imageUrl = generateSecureImageUrl(imageId)
        }
      }

      if (!imageUrl) {
        return null
      }

      return (
        <figure className="my-2 group">
          <div className="relative overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
            <Image
              src={imageUrl}
              alt={value.alt || ''}
              width={value.asset?.metadata?.dimensions?.width || 800}
              height={value.asset?.metadata?.dimensions?.height || 600}
              className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          {value.caption && (
            <figcaption className="mt-3 text-body-sm text-slate-600 dark:text-slate-400 text-center italic">
              {value.caption}
            </figcaption>
          )}
        </figure>
      )
    },

    // 代码块将在PortableTextRenderer组件中定义以使用hooks

    // 高亮块
    highlightBlock: ({ value }) => {
      const typeStyles = {
        info: {
          container:
            'border-blue-200 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-100/10',
          leftBorder: 'border-l-blue-300 dark:border-l-blue-400',
          title: 'text-blue-500 dark:text-blue-200',
          icon: '💡',
        },
        warning: {
          container:
            'border-amber-200 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/30',
          leftBorder: 'border-l-amber-500 dark:border-l-amber-400',
          title: 'text-amber-800 dark:text-amber-200',
          icon: '⚠️',
        },
        error: {
          container:
            'border-red-200 bg-red-50/50 dark:border-red-700 dark:bg-red-950/30',
          leftBorder: 'border-l-red-500 dark:border-l-red-400',
          title: 'text-red-800 dark:text-red-200',
          icon: '🚨',
        },
        success: {
          container:
            'border-emerald-200 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/30',
          leftBorder: 'border-l-emerald-500 dark:border-l-emerald-400',
          title: 'text-emerald-800 dark:text-emerald-200',
          icon: '✅',
        },
        note: {
          container:
            'border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-950/30',
          leftBorder: 'border-l-slate-500 dark:border-l-slate-400',
          title: 'text-slate-800 dark:text-slate-200',
          icon: '📝',
        },
      }

      const currentType =
        typeStyles[value.type as keyof typeof typeStyles] || typeStyles.info

      return (
        <div
          className={cn(
            'my-4 p-4 border rounded-lg shadow-sm',
            currentType.container,
            currentType.leftBorder,
            'border-l-4'
          )}
        >
          {value.title && (
            <div
              className={cn(
                'flex items-center gap-2 font-semibold',
                currentType.title
              )}
            >
              <span className="text-body-lg">{currentType.icon}</span>
              <span className="text-body-md">{value.title}</span>
            </div>
          )}
          <div className="text-body-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:text-body-sm [&_p]:leading-relaxed [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ml-0 [&_ol]:ml-0 [&_li]:text-body-sm [&_li]:leading-relaxed [&_li]:marker:text-slate-400 dark:[&_li]:marker:text-slate-500 [&_strong]:font-semibold [&_em]:italic [&_code]:text-xs [&_code]:bg-slate-100 [&_code]:dark:bg-slate-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">
            <PortableText value={value.content} components={components} />
          </div>
        </div>
      )
    },

    // 分隔线块
    separator: () => (
      <div className="my-8 flex justify-center">
        <div className="w-full max-w-xs h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"></div>
      </div>
    ),
  },
}

// 生成标题 ID
function generateHeadingId(value: unknown): string {
  const block = value as {
    children?: Array<{ text?: string; marks?: string[] }>
  }
  if (!block?.children) return ''

  // 提取所有文本内容，包括带有标记的文本
  const text = block.children
    .map((child) => child.text || '')
    .join('')
    .trim()

  if (!text) return ''

  // 处理中文和英文混合的标题
  return (
    text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff\s-]/g, '') // 保留中文字符
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '') // 移除开头和结尾的连字符
      .trim() || 'heading-' + Math.random().toString(36).substr(2, 9)
  ) // 如果为空则生成随机ID
}

// 提取标题的工具函数
export function extractHeadings(content: PortableTextElement[]): HeadingItem[] {
  if (!content || !Array.isArray(content)) return []

  const headings: HeadingItem[] = []

  content.forEach((block) => {
    if (
      block._type === 'block' &&
      'style' in block &&
      block.style &&
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(block.style) &&
      'children' in block &&
      Array.isArray(block.children)
    ) {
      const text =
        (block.children as Array<{ text?: string }>)
          ?.map((child) => child.text || '')
          .join('') || ''

      if (text.trim()) {
        headings.push({
          id: generateHeadingId(block),
          text: text.trim(),
          level: parseInt(block.style.replace('h', '')),
        })
      }
    }
  })

  return headings
}

export function PortableTextRenderer({
  content,
  onHeadingsExtracted,
}: PortableTextRendererProps) {
  const codeTheme = useCodeTheme()

  useEffect(() => {
    if (onHeadingsExtracted && content) {
      // Only extract headings if content is PortableTextElement[] type
      // Check if the first item has the custom properties that indicate PortableTextElement
      const isPortableTextElement =
        content.length > 0 &&
        content[0] &&
        typeof content[0] === 'object' &&
        '_type' in content[0] &&
        (content[0]._type === 'block' ||
          content[0]._type === 'codeBlock' ||
          content[0]._type === 'highlightBlock')

      if (isPortableTextElement) {
        const headings = extractHeadings(content as PortableTextElement[])
        onHeadingsExtracted(headings)
      }
    }
  }, [content, onHeadingsExtracted])

  if (!content || !Array.isArray(content)) {
    return null
  }

  // Create components with access to hooks
  const themedComponents: PortableTextComponents = {
    ...components,
    types: {
      ...components.types,
      codeBlock: ({ value }) => {
        const language = value.language || 'text'
        const code = value.code || ''

        return (
          <div className="my-2 group">
            {value.filename && (
              <div className="unified-filename px-4 py-2 text-body-sm font-mono border-b rounded-t-lg flex items-center justify-between">
                <span>{value.filename}</span>
                {language && (
                  <span className="unified-language-tag text-caption-xs uppercase px-2 py-1 rounded">
                    {language}
                  </span>
                )}
              </div>
            )}
            <div className="relative">
              <Highlight theme={codeTheme} code={code} language={language}>
                {({ style, tokens, getLineProps, getTokenProps }) => (
                  <pre
                    className={
                      'unified-code-block overflow-x-auto p-2 text-code-xs font-mono border,rounded-b-lg, scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600'
                      // cn(
                      //   'unified-code-block overflow-x-auto p-2 text-code-xs font-mono border',
                      //   value.filename ? 'rounded-b-lg' : 'rounded-lg',
                      //   'scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600'
                      // )
                    }
                    style={{
                      ...style,
                      margin: 0,
                    }}
                  >
                    {tokens.map((line, i) => (
                      <div key={i} {...getLineProps({ line })}>
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </div>
                    ))}
                  </pre>
                )}
              </Highlight>
              {!value.filename && language && language !== 'text' && (
                <div className="absolute top-2 right-2 unified-language-tag text-caption-xs px-2 py-1 rounded uppercase">
                  {language}
                </div>
              )}
            </div>
          </div>
        )
      },
    },
  }

  return (
    <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-slate">
      <PortableText
        value={content as PortableTextBlock[]}
        components={themedComponents}
      />
    </div>
  )
}

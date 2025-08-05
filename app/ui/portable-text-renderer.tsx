// app/ui/portable-text-renderer.tsx
'use client'

import React from 'react'
import { PortableText, PortableTextComponents } from '@portabletext/react'
import { PortableTextBlock } from '@portabletext/types'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import Prism from 'prismjs'

// 导入常用语言支持
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-scss'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-shell-session'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-rust'

// 导入主题样式
import 'prismjs/themes/prism-tomorrow.css'

interface PortableTextRendererProps {
  content: PortableTextBlock[]
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
          className="group relative scroll-mt-20 text-display-sm sm:text-display-lg font-bold tracking-tight mt-16 mb-3 [&:first-child]:mt-0 pl-4 sm:pl-6"
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
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
            </svg>
          </span>
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
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
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
        <p className="text-body-sm sm:text-body-base leading-6 [&:not(:first-child)]:mt-2">
          {children}
        </p>
      )
    },
    blockquote: ({ children }) => (
      <blockquote className="relative border-l-4 border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/30 pl-6 pr-4 py-2 my-2 rounded-r-lg">
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
      <ul className="my-6 ml-6 space-y-2 list-disc marker:text-slate-400 dark:marker:text-slate-500">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="my-6 ml-6 space-y-2 list-decimal marker:text-slate-400 dark:marker:text-slate-500 marker:font-medium">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => (
      <li className="text-body-sm sm:text-body-base text-slate-700 dark:text-slate-300 leading-relaxed pl-2">
        {children}
      </li>
    ),
    number: ({ children }) => (
      <li className="text-body-sm sm:text-body-base text-slate-700 dark:text-slate-300 leading-relaxed pl-2">
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
      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-code-sm font-semibold">
        {children}
      </code>
    ),
    underline: ({ children }) => <u className="underline">{children}</u>,
    'strike-through': ({ children }) => (
      <s className="line-through">{children}</s>
    ),

    // 自定义高亮装饰器
    highlight: ({ children }) => (
      <mark className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200 px-1.5 py-0.5 rounded-md font-medium">
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
    table: ({
      value,
    }: {
      value: { rows?: Array<{ cells?: PortableTextBlock[] }> }
    }) => (
      <div className="my-8 overflow-x-auto">
        <table className="min-w-full border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              {value.rows?.[0]?.cells?.map(
                (cell: PortableTextBlock, index: number) => (
                  <th
                    key={index}
                    className="px-4 py-3 text-left text-body-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700"
                  >
                    <PortableText value={[cell]} />
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
            {value.rows
              ?.slice(1)
              ?.map(
                (row: { cells?: PortableTextBlock[] }, rowIndex: number) => (
                  <tr
                    key={rowIndex}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {row.cells?.map(
                      (cell: PortableTextBlock, cellIndex: number) => (
                        <td
                          key={cellIndex}
                          className="px-4 py-3 text-body-sm text-slate-700 dark:text-slate-300"
                        >
                          <PortableText value={[cell]} />
                        </td>
                      )
                    )}
                  </tr>
                )
              )}
          </tbody>
        </table>
      </div>
    ),

    // 图片
    image: ({ value }) => (
      <figure className="my-8 group">
        <div className="relative overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
          <img
            src={value.asset?.url}
            alt={value.alt || ''}
            className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
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
    ),

    // 代码块
    codeBlock: ({ value }) => {
      const language = value.language || 'text'
      const code = value.code || ''

      // 使用Prism进行语法高亮
      const highlightedCode = Prism.languages[language]
        ? Prism.highlight(code, Prism.languages[language], language)
        : code

      return (
        <div className="my-2 group">
          {value.filename && (
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 text-body-sm font-mono border-b border-slate-200 dark:border-slate-700 rounded-t-lg flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">
                {value.filename}
              </span>
              {language && (
                <span className="text-caption-xs text-slate-500 dark:text-slate-400 uppercase">
                  {language}
                </span>
              )}
            </div>
          )}
          <div className="relative">
            <pre
              className={cn(
                'overflow-x-auto bg-gray-300/20 dark:bg-gray-100/10 p-2 text-code-sm font-mono',
                'border border-slate-200 dark:border-slate-700',
                value.filename ? 'rounded-b-lg' : 'rounded-lg',
                'scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600'
              )}
            >
              <code
                className="text-slate-800 dark:text-slate-200"
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
              />
            </pre>
            {!value.filename && language && language !== 'text' && (
              <div className="absolute top-2 right-2 text-caption-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-gray-600/50 px-2 py-1 rounded uppercase">
                {language}
              </div>
            )}
          </div>
        </div>
      )
    },

    // 高亮块
    highlightBlock: ({ value }) => {
      const typeStyles = {
        info: {
          container:
            'border-blue-200 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-100/10',
          leftBorder: 'border-l-blue-500 dark:border-l-blue-400',
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
            'my-4 p-2 border rounded-lg shadow-sm',
            currentType.container,
            currentType.leftBorder,
            'border-l-4'
          )}
        >
          {value.title && (
            <div
              className={cn(
                'flex items-center gap-2 font-semibold mb-2',
                currentType.title
              )}
            >
              <span className="text-body-lg">{currentType.icon}</span>
              <span>{value.title}</span>
            </div>
          )}
          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ml-4 [&_ol]:ml-4 [&_li]:marker:text-slate-400 dark:[&_li]:marker:text-slate-500">
            <PortableText value={value.content} components={components} />
          </div>
        </div>
      )
    },
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
export function extractHeadings(content: PortableTextBlock[]): HeadingItem[] {
  if (!content || !Array.isArray(content)) return []

  const headings: HeadingItem[] = []

  content.forEach((block) => {
    if (
      block._type === 'block' &&
      block.style &&
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(block.style)
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
  // 提取标题并通知父组件
  useEffect(() => {
    if (onHeadingsExtracted) {
      const headings = extractHeadings(content)
      onHeadingsExtracted(headings)
    }
  }, [content, onHeadingsExtracted])

  if (!content || !Array.isArray(content)) {
    return null
  }

  return (
    <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-slate">
      <PortableText value={content} components={components} />
    </div>
  )
}

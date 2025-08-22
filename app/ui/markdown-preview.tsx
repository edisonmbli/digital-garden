'use client'

import { useMemo, useState, useEffect } from 'react'
import { PortableTextRenderer } from './portable-text-renderer'
import { markdownToPortableText } from '@/lib/markdown-to-portable-text'
import { PortableTextBlock } from '@portabletext/types'
import { cn } from '@/lib/utils'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  const [portableText, setPortableText] = useState<PortableTextBlock[]>([])
  const [isConverting, setIsConverting] = useState(false)

  const stats = useMemo(() => {
    if (!content) return { words: 0, characters: 0, lines: 0, readingTime: 0 }
    
    const words = content.trim().split(/\s+/).filter(word => word.length > 0).length
    const characters = content.length
    const lines = content.split('\n').length
    const readingTime = Math.ceil(words / 200) // 假设每分钟阅读200字
    
    return { words, characters, lines, readingTime }
  }, [content])

  // 转换markdown为portable text
  useEffect(() => {
    if (!content) {
      setPortableText([])
      return
    }

    setIsConverting(true)
    markdownToPortableText(content)
      .then(result => {
        // 将PortableTextElement[]转换为PortableTextBlock[]
        const blocks = result as PortableTextBlock[]
        setPortableText(blocks)
      })
      .catch(error => {
        console.error('Markdown转换失败:', error)
        setPortableText([])
      })
      .finally(() => setIsConverting(false))
  }, [content])

  if (!content) {
    return (
      <div className={cn('flex items-center justify-center h-full border-2 border-dashed border-muted-foreground/25 rounded-lg', className)}>
        <div className="text-center text-muted-foreground">
          <div className="text-lg font-medium mb-2">实时预览</div>
          <div className="text-sm">在左侧编辑器中输入 Markdown 内容</div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4 h-full flex flex-col', className)}>
      {/* 统计信息 */}
      <div className="flex items-center gap-4 p-3 bg-muted rounded-lg text-sm flex-shrink-0">
        <div className="flex items-center gap-1">
          <span className="font-medium">{stats.words}</span>
          <span className="text-muted-foreground">字</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">{stats.characters}</span>
          <span className="text-muted-foreground">字符</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">{stats.lines}</span>
          <span className="text-muted-foreground">行</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">{stats.readingTime}</span>
          <span className="text-muted-foreground">分钟阅读</span>
        </div>
      </div>

      {/* 预览内容 */}
      <div className="border rounded-lg p-6 bg-background flex-1 overflow-y-auto">
        {isConverting ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">转换中...</div>
          </div>
        ) : (
          <PortableTextRenderer content={portableText} />
        )}
      </div>
    </div>
  )
}
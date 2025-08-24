'use client'

import { useState, useEffect, forwardRef } from 'react'
import { PortableTextRenderer } from '@/app/ui/portable-text-renderer'
import { cn } from '@/lib/utils'
import {
  markdownToPortableText,
  PortableTextElement,
} from '@/lib/markdown-to-portable-text'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export const MarkdownPreview = forwardRef<HTMLDivElement, MarkdownPreviewProps>(
  ({ content, className }, ref) => {
    const [portableText, setPortableText] = useState<PortableTextElement[]>([])
    const [isConverting, setIsConverting] = useState(false)

    useEffect(() => {
      if (!content) {
        setPortableText([])
        return
      }

      setIsConverting(true)
      markdownToPortableText(content)
        .then(result => {
          setPortableText(result)
        })
        .catch(error => {
          console.error('Markdown conversion failed:', error)
          setPortableText([])
        })
        .finally(() => setIsConverting(false))
    }, [content])

    return (
      <div className={cn('h-full flex flex-col', className)}>
        {!content ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <div className="text-display-sm mb-2">实时预览</div>
            <div className="text-sm">在左侧编辑器中输入 Markdown 内容</div>
          </div>
        ) : (
          <div
            ref={ref}
            className="prose dark:prose-invert max-w-none h-full overflow-y-auto p-4 pt-2 font-sans"
          >
            {isConverting ? (
              <div className="flex items-center justify-center">
                <div className="text-muted-foreground">转换中...</div>
              </div>
            ) : (
              <PortableTextRenderer content={portableText} />
            )}
          </div>
        )}
      </div>
    );
  },
);

MarkdownPreview.displayName = 'MarkdownPreview';

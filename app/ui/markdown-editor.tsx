'use client'

import { useState, useCallback, forwardRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Upload, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
  onScroll?: (event: React.UIEvent<HTMLTextAreaElement>) => void
}

export const MarkdownEditor = forwardRef<
  HTMLTextAreaElement,
  MarkdownEditorProps
>(
  (
    {
      value,
      onChange,
      className,
      onScroll,
    },
    ref,
  ) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleFileUpload = useCallback(
      (file: File) => {
        if (file.type !== 'text/markdown' && !file.name.endsWith('.md')) {
          alert('请上传 .md 格式的文件');
          return;
        }

        if (file.size > 10 * 1024 * 1024) {
          // 10MB
          alert('文件大小不能超过 10MB');
          return;
        }

        const reader = new FileReader();
        reader.onload = e => {
          const content = e.target?.result as string;
          onChange(content);
        };
        reader.readAsText(file);
      },
      [onChange],
    );

    const handleInternalScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
      console.log('--- MarkdownEditor scroll event fired ---');
      onScroll?.(e);
    };

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        const files = Array.from(e.dataTransfer.files)
        if (files.length > 0) {
          handleFileUpload(files[0])
        }
      },
      [handleFileUpload],
    )

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
    }, [])

    const handleFileInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files && files.length > 0) {
          handleFileUpload(files[0])
        }
      },
      [handleFileUpload],
    )

    const clearContent = useCallback(() => {
      onChange('')
    }, [onChange])

    return (
      <div
        className={cn(
          'h-full flex flex-col transition-colors',
          !value && 'border-2 border-dashed rounded-lg',
          isDragOver
            ? 'border-primary bg-primary/5'
            : !value
            ? 'border-muted-foreground/25 hover:border-muted-foreground/50'
            : 'border-transparent',
          className,
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {!value ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-display-sm mb-2">上传 Markdown 文件</h3>
            <p className="text-muted-foreground mb-4">
              拖拽文件到此处，或点击选择文件
            </p>
            <div className="space-y-2">
              <Button variant="outline" asChild>
                <label className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  选择文件
                  <input
                    type="file"
                    accept=".md,.markdown"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </label>
              </Button>
              <p className="text-xs text-muted-foreground">
                支持 .md 格式，最大 10MB
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col space-y-2 p-1">
            <Textarea
              ref={ref}
              value={value}
              onChange={e => onChange(e.target.value)}
              onScroll={handleInternalScroll}
              placeholder="在此编辑 Markdown 内容..."
              className="flex-1 text-code text-sm resize-none w-full h-full border-0 focus-visible:ring-0"
            />
            <div className="flex justify-end items-center flex-shrink-0">
              <Button variant="ghost" onClick={clearContent}>
                清空内容
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }
)

MarkdownEditor.displayName = 'MarkdownEditor'
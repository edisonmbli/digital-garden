'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Upload, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function MarkdownEditor({ value, onChange, className }: MarkdownEditorProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFileUpload = useCallback((file: File) => {
    if (file.type !== 'text/markdown' && !file.name.endsWith('.md')) {
      alert('请上传 .md 格式的文件')
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      alert('文件大小不能超过 10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      onChange(content)
      setFileName(file.name)
    }
    reader.readAsText(file)
  }, [onChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  const clearContent = useCallback(() => {
    onChange('')
    setFileName(null)
  }, [onChange])

  return (
    <div className={cn('space-y-4 h-full flex flex-col', className)}>
      {/* 文件上传区域 */}
      {!value && (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">上传 Markdown 文件</h3>
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
      )}

      {/* 编辑器区域 */}
      {(value || fileName) && (
        <div className="space-y-4 flex-1 flex flex-col">
          {fileName && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">{fileName}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearContent}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="在此编辑 Markdown 内容..."
            className="flex-1 font-mono text-sm resize-none"
          />
          
          {!fileName && (
            <div className="flex justify-between items-center flex-shrink-0">
              <Button variant="outline" asChild>
                <label className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  上传文件
                  <input
                    type="file"
                    accept=".md,.markdown"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </label>
              </Button>
              <Button variant="ghost" onClick={clearContent}>
                清空内容
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
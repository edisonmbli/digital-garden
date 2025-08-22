// app/[lang]/admin/markdown-converter/page.tsx
// Markdown转换器管理页面

import { Metadata } from 'next'
import { FileText, Upload, Zap, Database } from 'lucide-react'
import { MarkdownConverterClient } from '@/app/ui/markdown-converter-client'

export const metadata: Metadata = {
  title: 'Markdown转换器 | 管理后台',
  description: '将Markdown文件转换为Sanity Portable Text格式并同步到Sanity',
}

export default function MarkdownConverterPage() {
  return (
    <div className="container mx-auto py-4 space-y-4 min-h-[calc(100vh-8rem)] flex flex-col">
      {/* 页面标题 - 紧凑布局 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-sm flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Markdown 转换器
          </h1>
          {/* <p className="text-muted-foreground text-sm">
            编辑 Markdown 内容，实时预览渲染效果，一键同步到 Sanity
          </p> */}
        </div>

        {/* 功能标签 - 水平紧凑布局 */}
        <div className="hidden lg:flex items-center gap-4 text-body-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Upload className="h-3 w-3 text-blue-600" />
            <span>文件上传</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-green-600" />
            <span>智能转换</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3 text-purple-600" />
            <span>实时预览</span>
          </div>
          <div className="flex items-center gap-1">
            <Database className="h-3 w-3 text-orange-600" />
            <span>一键同步</span>
          </div>
        </div>
      </div>

      {/* 主要功能区域 - 占据剩余空间 */}
      <div className="flex-1 min-h-0">
        <MarkdownConverterClient />
      </div>
    </div>
  )
}

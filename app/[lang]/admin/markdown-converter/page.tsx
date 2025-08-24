// app/[lang]/admin/markdown-converter-v2/page.tsx
// Markdown转换器管理页面 v2

import { Metadata } from 'next'
import { FileText, Upload, Zap, Database } from 'lucide-react'
import { MarkdownConverterClientV2 } from '@/app/ui/admin/markdown-converter-client-v2'

export const metadata: Metadata = {
  title: 'Markdown转换器 v2 | 管理后台',
  description: '将Markdown文件转换为Sanity Portable Text格式并同步到Sanity',
}

export default function MarkdownConverterPageV2() {
  return (
    <div className="container mx-auto py-4 space-y-4">
      {/* 页面标题 - 紧凑布局 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-sm flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Markdown 转换器 v2
          </h1>
          <p className="text-muted-foreground text-sm">
            精准同步滚动，优化编辑体验
          </p>
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

      {/* 主要功能区域 */}
      <div>
        <MarkdownConverterClientV2 />
      </div>
    </div>
  )
}
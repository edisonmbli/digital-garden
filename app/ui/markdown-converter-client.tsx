'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { MarkdownEditor } from '@/app/ui/markdown-editor'
import { MarkdownPreview } from '@/app/ui/markdown-preview'
import { SanitySyncForm } from '@/app/ui/sanity-sync-form'

export function MarkdownConverterClient() {
  const [markdownContent, setMarkdownContent] = useState('')

  return (
    <div className="space-y-8 h-full flex flex-col">
      {/* 操作区域 - 居中布局，三层结构 */}
      <div className="max-w-4xl mx-auto w-full py-6 space-y-6">
        {/* 第一层：辅助说明 */}
        <div className="px-8">
          <p className="text-sm text-muted-foreground">
            1. 上传Markdown 2. 实时预览 3. 选择同步目标 4.生效至Sanity Portable
          </p>
        </div>
        
        {/* 第二层：操作控件（包含选择器和同步按钮） */}
        <div className="px-8">
          <SanitySyncForm
            markdownContent={markdownContent}
            renderSyncButton={(button) => button}
          />
        </div>
        

      </div>

      {/* 主工作区域 - 占据剩余空间 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* 左侧：Markdown编辑区 */}
        <Card className="flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle>Markdown 编辑器</CardTitle>
            <CardDescription>
              上传文件后，可直接编辑 Markdown 内容
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <MarkdownEditor
              value={markdownContent}
              onChange={setMarkdownContent}
              className="h-full"
            />
          </CardContent>
        </Card>

        {/* 右侧：实时预览区 */}
        <Card className="flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle>实时预览</CardTitle>
            <CardDescription>查看 Markdown 内容的最终渲染效果</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <MarkdownPreview content={markdownContent} className="h-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { MarkdownEditor } from '@/app/ui/markdown-editor'
import { MarkdownPreview } from '@/app/ui/markdown-preview'
import { SanitySyncForm } from '@/app/ui/sanity-sync-form'

export function MarkdownConverterClientV2() {
  const [markdownContent, setMarkdownContent] = useState('')
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const handleEditorScroll = () => {
    if (editorRef.current && previewRef.current) {
      const editor = editorRef.current
      const preview = previewRef.current

      // 当编辑器滚动到底部时，scrollHeight - clientHeight === scrollTop
      const scrollPercentage =
        editor.scrollTop / (editor.scrollHeight - editor.clientHeight)

      const previewScrollTop =
        scrollPercentage * (preview.scrollHeight - preview.clientHeight)

      console.log('Syncing scroll', {
        editorScrollTop: editor.scrollTop,
        editorScrollHeight: editor.scrollHeight,
        editorClientHeight: editor.clientHeight,
        scrollPercentage,
        previewScrollHeight: preview.scrollHeight,
        previewClientHeight: preview.clientHeight,
        calculatedPreviewScrollTop: previewScrollTop,
      })

      preview.scrollTop = previewScrollTop
    }
  }

  return (
    <div className="space-y-4">
      {/* 上方：操作区 */}
      <Card>
        <CardContent className="flex justify-center">
          <SanitySyncForm
            markdownContent={markdownContent}
            onSync={(result) => {
              console.log('Sync result:', result)
              // TODO: Add user-facing notification (e.g., toast)
            }}
          />
        </CardContent>
      </Card>

      {/* 下方：编辑器和预览区 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 左侧：Markdown 编辑器 */}
        <Card>
          <CardHeader>
            <CardTitle>Markdown 编辑器</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="p-0 overflow-hidden h-[70vh]">
            <MarkdownEditor
              ref={editorRef}
              value={markdownContent}
              onChange={setMarkdownContent}
              onScroll={handleEditorScroll}
              className="h-full !border-0 !rounded-none"
            />
          </CardContent>
        </Card>

        {/* 右侧：实时预览 */}
        <Card>
          <CardHeader>
            <CardTitle>实时预览</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="p-0 h-[70vh]">
            <MarkdownPreview
              ref={previewRef}
              content={markdownContent}
              className="h-full !border-0 !rounded-none overflow-y-auto"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

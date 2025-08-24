'use client'

// app/ui/markdown-uploader.tsx
// Markdown文件上传和转换管理界面

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Upload, FileText, CheckCircle, AlertCircle, Download, Eye } from 'lucide-react'
import { PortableTextRenderer } from './portable-text-renderer'
import { uploadAndConvertMarkdown } from '@/lib/markdown-actions'
import { PortableTextElement } from '@/lib/markdown-to-portable-text'

interface ConversionResult {
  filename: string
  size: number
  portableText: PortableTextElement[]
  stats: {
    totalBlocks: number
    blockTypes: Record<string, number>
    headings: number
    codeBlocks: number
    images: number
    tables: number
  }
  convertedAt: string
}

interface UploadState {
  isUploading: boolean
  progress: number
  result: ConversionResult | null
  error: string | null
}

export function MarkdownUploader() {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    result: null,
    error: null
  })

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setUploadState({
      isUploading: true,
      progress: 0,
      result: null,
      error: null
    })

    try {
      // 模拟上传进度
      setUploadState(prev => ({ ...prev, progress: 25 }))

      const formData = new FormData()
      formData.append('file', file)

      setUploadState(prev => ({ ...prev, progress: 50 }))

      const result = await uploadAndConvertMarkdown(formData)

      setUploadState(prev => ({ ...prev, progress: 75 }))

      if (!result.success) {
        throw new Error(result.error || '上传失败')
      }

      setUploadState({
        isUploading: false,
        progress: 100,
        result: result.data!,
        error: null
      })

    } catch (error) {
      setUploadState({
        isUploading: false,
        progress: 0,
        result: null,
        error: error instanceof Error ? error.message : '上传失败'
      })
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/markdown': ['.md', '.markdown'],
      'text/plain': ['.md']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  })

  const downloadPortableText = () => {
    if (!uploadState.result) return

    const dataStr = JSON.stringify(uploadState.result.portableText, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${uploadState.result.filename.replace('.md', '')}-portable-text.json`
    link.click()
    URL.revokeObjectURL(url)
  }



  const resetUploader = () => {
    setUploadState({
      isUploading: false,
      progress: 0,
      result: null,
      error: null
    })
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* 上传区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Markdown 文件上传转换
          </CardTitle>
          <CardDescription>
            上传 .md 文件，自动转换为 Sanity Portable Text 格式
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!uploadState.result && (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
                }
                ${uploadState.isUploading ? 'pointer-events-none opacity-50' : ''}
              `}
            >
              <input {...getInputProps()} />
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-lg font-medium">拖放文件到这里...</p>
              ) : (
                <div>
                  <p className="text-lg font-medium mb-2">拖放 Markdown 文件到这里</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    或点击选择文件（支持 .md 格式，最大 10MB）
                  </p>
                  <Button variant="outline" disabled={uploadState.isUploading}>
                    选择文件
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 上传进度 */}
          {uploadState.isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>正在处理文件...</span>
                <span>{uploadState.progress}%</span>
              </div>
              <Progress value={uploadState.progress} className="w-full" />
            </div>
          )}

          {/* 错误信息 */}
          {uploadState.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadState.error}</AlertDescription>
            </Alert>
          )}

          {/* 成功结果 */}
          {uploadState.result && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  文件 &ldquo;{uploadState.result.filename}&rdquo; 转换成功！
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={downloadPortableText} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  下载 JSON
                </Button>
                <Button onClick={resetUploader} variant="outline">
                  上传新文件
                </Button>
              </div>

            </div>
          )}
        </CardContent>
      </Card>

      {/* 转换结果展示 */}
      {uploadState.result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              转换结果
            </CardTitle>
            <CardDescription>
              文件: {uploadState.result.filename} | 
              大小: {(uploadState.result.size / 1024).toFixed(1)} KB | 
              转换时间: {new Date(uploadState.result.convertedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="preview">预览</TabsTrigger>
                <TabsTrigger value="stats">统计</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>
              
              <TabsContent value="preview" className="mt-4">
                <ScrollArea className="h-96 w-full border rounded-md p-4">
                  <PortableTextRenderer content={uploadState.result.portableText} />
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="stats" className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{uploadState.result.stats.totalBlocks}</div>
                    <div className="text-sm text-muted-foreground">总块数</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{uploadState.result.stats.headings}</div>
                    <div className="text-sm text-muted-foreground">标题</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{uploadState.result.stats.codeBlocks}</div>
                    <div className="text-sm text-muted-foreground">代码块</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{uploadState.result.stats.tables}</div>
                    <div className="text-sm text-muted-foreground">表格</div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="font-medium mb-2">块类型分布</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(uploadState.result.stats.blockTypes).map(([type, count]) => (
                      <Badge key={type} variant="secondary">
                        {type}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="json" className="mt-4">
                <ScrollArea className="h-96 w-full">
                  <pre className="text-xs bg-muted p-4 rounded-md overflow-auto">
                    {JSON.stringify(uploadState.result.portableText, null, 2)}
                  </pre>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
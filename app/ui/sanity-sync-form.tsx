'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Loader2,
  Database,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
// 导入Server Actions
import {
  testSanityConnection,
  getDocumentTypes,
  syncToSanity,
} from '@/lib/sanity-sync-actions'
import { DocumentSelector } from './document-selector'

interface SanitySyncFormProps {
  markdownContent: string
  onSync?: (result: { success: boolean; message: string }) => void
  className?: string
  renderSyncButton?: (syncButton: React.ReactNode) => React.ReactNode
}

interface DocumentType {
  name: string
  title: string
  fields: Array<{
    name: string
    title: string
    type: string
  }>
}

export function SanitySyncForm({
  markdownContent,
  onSync,
  className,
  renderSyncButton,
}: SanitySyncFormProps) {
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedDocument, setSelectedDocument] = useState<string>('')
  const [selectedField, setSelectedField] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isConnected, setIsConnected] = useState(false)

  // 手动获取文档类型
  const fetchDocumentTypes = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getDocumentTypes()

      if (result.success) {
        setDocumentTypes(result.data)
        setIsConnected(true)
        // 默认选择第一个类型
        if (result.data.length > 0) {
          setSelectedType(result.data[0].name)
        }
      } else {
        setError(result.error || '获取文档类型失败')
        setIsConnected(false)
      }
    } catch (err) {
      setError('获取文档类型失败')
      setIsConnected(false)
      console.error('Error fetching document types:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // 当选择文档类型时，重置选择状态
  useEffect(() => {
    if (selectedType) {
      setSelectedDocument('')
      setSelectedField('')
    }
  }, [selectedType])

  // 当选择文档类型时，设置默认字段
  useEffect(() => {
    if (selectedType && documentTypes.length > 0) {
      const type = documentTypes.find((t) => t.name === selectedType)
      if (type && type.fields.length > 0) {
        // 优先选择content字段，否则选择第一个字段
        const contentField = type.fields.find((f) => f.name === 'content')
        setSelectedField(contentField ? contentField.name : type.fields[0].name)
      }
    }
  }, [selectedType, documentTypes])

  const handleSync = async () => {
    if (
      !markdownContent ||
      !selectedType ||
      !selectedDocument ||
      !selectedField
    ) {
      setError('请完善所有选项')
      return
    }

    setError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      try {
        const result = await syncToSanity({
          markdownContent,
          documentType: selectedType,
          documentId: selectedDocument,
          targetField: selectedField,
        })

        if (result.success) {
          setSuccessMessage(result.message)
          // 3秒后自动清除成功消息
          setTimeout(() => setSuccessMessage(null), 3000)
          onSync?.(result)
        } else {
          setError(result.message)
        }
      } catch (err) {
        setError('同步过程中发生错误')
        console.error('同步错误:', err)
      }
    })
  }

  const handleTestConnection = async () => {
    setIsTestingConnection(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const result = await testSanityConnection()

      if (result.success) {
        setSuccessMessage('Sanity连接测试成功！')
        // 3秒后自动清除成功消息
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        setError(result.error || '连接测试失败')
      }
    } catch (err) {
      setError('连接测试过程中发生错误')
      console.error('连接测试错误:', err)
    } finally {
      setIsTestingConnection(false)
    }
  }

  const selectedTypeData = documentTypes.find((t) => t.name === selectedType)
  const portableTextFields = selectedTypeData?.fields || []

  return (
    <div className={cn('space-y-6', className)}>

      {/* 连接测试区域 */}
      {!isConnected && (
        <div className="text-center space-y-4 py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <Database className="h-12 w-12 mx-auto text-gray-400" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              连接到 Sanity
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              点击下方按钮测试 Sanity 连接并加载文档类型
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              variant="outline"
            >
              {isTestingConnection ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  测试连接中...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  测试连接
                </>
              )}
            </Button>
            <Button
              onClick={fetchDocumentTypes}
              disabled={isLoading}
              variant="default"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  加载中...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  加载文档类型
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 选择器区域 - 只有连接成功后才显示 */}
      {isConnected && (
        <div className="flex justify-between items-end gap-6">
          {/* 左侧：选择器组 */}
          <div className="flex gap-4 flex-1 pr-8">
            {/* 文档类型选择 */}
            <div className="space-y-2">
              <Label htmlFor="document-type">文档类型</Label>
              <Select
                value={selectedType}
                onValueChange={setSelectedType}
                disabled={isLoading}
              >
                <SelectTrigger id="document-type" className="h-10">
                  <SelectValue placeholder="选择文档类型" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.name} value={type.name}>
                      {type.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 目标字段选择 */}
            <div className="space-y-2">
              <Label htmlFor="target-field">目标字段</Label>
              <Select
                value={selectedField}
                onValueChange={setSelectedField}
                disabled={isLoading || !selectedType}
              >
                <SelectTrigger id="target-field" className="h-10">
                  <SelectValue placeholder="选择字段" />
                </SelectTrigger>
                <SelectContent>
                  {portableTextFields.map((field) => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 具体文档选择 */}
            <div className="flex-1 space-y-2">
              <DocumentSelector
                documentType={selectedType}
                value={selectedDocument}
                onValueChange={setSelectedDocument}
                disabled={isLoading || !selectedType}
                placeholder="目标文档"
                className="w-full"
              />
            </div>
          </div>

          {/* 右侧：同步按钮 */}
          <div className="flex items-end ml-4">
            {renderSyncButton &&
              renderSyncButton(
                <Button
                  onClick={handleSync}
                  disabled={
                    !markdownContent ||
                    !selectedType ||
                    !selectedDocument ||
                    !selectedField ||
                    isPending
                  }
                  className="min-w-[120px] h-10"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      同步中...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      同步到 Sanity
                    </>
                  )}
                </Button>
              )}
          </div>
        </div>
      )}

      {/* 状态提示 */}
      {(isLoading || isTestingConnection) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {isLoading ? '加载文档类型中...' : '测试Sanity连接中...'}
        </div>
      )}

      {/* 同步状态详情 */}
      {isPending && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
            <RefreshCw className="h-4 w-4 animate-spin" />
            正在将 Markdown 转换为 Portable Text 并同步到 Sanity...
          </div>
        </div>
      )}

      {/* 第三层：消息提示区域 */}
      <div className="mt-4">
        {successMessage && (
          <Alert variant="default" className="max-w-md">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
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
}: SanitySyncFormProps) {
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedField, setSelectedField] = useState<string>('')
  const [selectedDocument, setSelectedDocument] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isConnected, setIsConnected] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // 当弹窗打开且未连接时，获取文档类型
  useEffect(() => {
    if (isDialogOpen && !isConnected && !isLoading) {
      fetchDocumentTypes()
    }
  }, [isDialogOpen, isConnected, isLoading])

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

  const handleSync = () => {
    startTransition(async () => {
      try {
        if (!selectedType || !selectedDocument || !selectedField) {
          toast.error('请先完成所有选择')
          return
        }

        const result = await syncToSanity({
          markdownContent,
          documentType: selectedType,
          documentId: selectedDocument,
          targetField: selectedField,
        })

        if (result.success) {
          toast.success(result.message || '同步成功！')
          onSync?.(result)
          setIsDialogOpen(false) // 同步成功后关闭弹窗
        } else {
          toast.error(result.message || '同步失败')
        }
      } catch (err) {
        toast.error('同步过程中发生错误')
        console.error('同步错误:', err)
      } finally {
        // startTransition 会自动管理 isPending 状态
      }
    })
  }

  const handleTestConnection = async () => {
    setIsTestingConnection(true)

    try {
      const result = await testSanityConnection()

      if (result.success) {
        toast.success(result.message || 'Sanity 连接测试成功！')
      } else {
        toast.error(result.error || '连接测试失败')
      }
    } catch (err) {
      toast.error('连接测试过程中发生错误')
      console.error('连接测试错误:', err)
    } finally {
      setIsTestingConnection(false)
    }
  }

  const selectedTypeData = documentTypes.find(t => t.name === selectedType)
  const portableTextFields = selectedTypeData?.fields || []

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        onClick={handleTestConnection}
        disabled={isTestingConnection}
        variant="outline"
        size="sm"
      >
        {isTestingConnection ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Database className="mr-2 h-4 w-4" />
        )}
        测试连接
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="default" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            同步 Sanity
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>同步到 Sanity</DialogTitle>
            <DialogDescription>
              选择文档类型、目标文档和字段，将当前 Markdown 内容同步过去。
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error} - 你可以尝试刷新页面或检查 Sanity 配置。
              </AlertDescription>
            </Alert>
          ) : isConnected ? (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="document-type" className="text-right">
                  文档类型
                </Label>
                <Select
                  value={selectedType}
                  onValueChange={setSelectedType}
                  disabled={isLoading}
                >
                  <SelectTrigger id="document-type" className="col-span-3">
                    <SelectValue placeholder="选择文档类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map(type => (
                      <SelectItem key={type.name} value={type.name}>
                        {type.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="target-field" className="text-right">
                  目标字段
                </Label>
                <Select
                  value={selectedField}
                  onValueChange={setSelectedField}
                  disabled={isLoading || !selectedType}
                >
                  <SelectTrigger id="target-field" className="col-span-3">
                    <SelectValue placeholder="选择字段" />
                  </SelectTrigger>
                  <SelectContent>
                    {portableTextFields.map(field => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">目标文档</Label>
                <div className="col-span-3">
                  <DocumentSelector
                    documentType={selectedType}
                    value={selectedDocument}
                    onValueChange={setSelectedDocument}
                    disabled={isLoading || !selectedType}
                    placeholder="选择或搜索目标文档"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              onClick={handleSync}
              disabled={
                !markdownContent ||
                !selectedType ||
                !selectedDocument ||
                !selectedField ||
                isPending
              }
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  同步中...
                </>
              ) : (
                '确认同步'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

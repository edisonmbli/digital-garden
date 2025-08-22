'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Search, ChevronDown, FileText, Edit } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDocumentsByType } from '@/lib/sanity-sync-actions'

interface Document {
  _id: string
  _type: string
  title?: string
  slug?: { current: string }
  isDraft?: boolean
}

interface DocumentSelectorProps {
  documentType: string
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function DocumentSelector({
  documentType,
  value,
  onValueChange,
  disabled = false,
  placeholder = "选择文档",
  className
}: DocumentSelectorProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // 获取文档列表
  const fetchDocuments = useCallback(async (
    search: string = '',
    offset: number = 0,
    append: boolean = false
  ) => {
    if (!documentType) return

    if (offset === 0) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }
    setError(null)

    try {
      const result = await getDocumentsByType(documentType, {
        limit: 6,
        offset,
        searchTerm: search
      })

      if (result.success) {
        if (append) {
          setDocuments(prev => [...prev, ...result.data])
        } else {
          setDocuments(result.data)
        }
        setHasMore(result.hasMore)
        setTotal(result.total)
        
        if (result.data.length === 0 && offset === 0) {
          setError(search ? '未找到匹配的文档' : '该文档类型下暂无文档')
        }
      } else {
        setError(result.error || '获取文档列表失败')
        if (!append) {
          setDocuments([])
        }
      }
    } catch (err) {
      setError('获取文档列表失败，请检查网络连接')
      console.error('Error fetching documents:', err)
      if (!append) {
        setDocuments([])
      }
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [documentType])

  // 加载更多文档
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchDocuments(searchTerm, documents.length, true)
    }
  }, [fetchDocuments, searchTerm, documents.length, isLoadingMore, hasMore])

  // 处理搜索
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)
    
    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // 设置新的定时器，延迟搜索
    searchTimeoutRef.current = setTimeout(() => {
      fetchDocuments(term, 0, false)
    }, 300)
  }, [fetchDocuments])

  // 处理滚动事件
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    
    // 当滚动到底部附近时加载更多
    if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !isLoadingMore) {
      loadMore()
    }
  }, [hasMore, isLoadingMore, loadMore])

  // 选择文档
  const selectDocument = useCallback((doc: Document) => {
    onValueChange(doc._id)
    setIsOpen(false)
  }, [onValueChange])

  // 获取选中文档的显示文本
  const getSelectedDocumentText = useCallback(() => {
    if (!value) return placeholder
    const selectedDoc = documents.find(doc => doc._id === value)
    return selectedDoc ? (selectedDoc.title || selectedDoc.slug?.current || selectedDoc._id) : value
  }, [value, documents, placeholder])

  // 初始加载
  useEffect(() => {
    if (documentType) {
      fetchDocuments('', 0, false)
    }
  }, [documentType, fetchDocuments])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor="document-selector">
        目标文档
        {isLoading && (
          <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />
        )}
        {total > 0 && (
          <span className="text-xs text-muted-foreground ml-1">({total}个)</span>
        )}
      </Label>
      <div className="relative">
      
      {/* 选择器触发按钮 */}
      <Button
        id="document-selector"
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        className={cn(
          "w-full justify-between font-normal h-10",
          !value && "text-muted-foreground"
        )}
        disabled={disabled || isLoading}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{getSelectedDocumentText()}</span>
        <ChevronDown className={cn(
          "ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform",
          isOpen && "rotate-180"
        )} />
      </Button>

      {/* 下拉面板 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-md">
          {/* 搜索框 */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索文档..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8"
                autoFocus
              />
            </div>
          </div>

          {/* 文档列表 */}
          <div className="max-h-60 overflow-auto" onScroll={handleScroll}>
            <div className="p-1">
              {error ? (
                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                  {error}
                </div>
              ) : documents.length === 0 && !isLoading ? (
                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                  {searchTerm ? "未找到匹配的文档" : "暂无文档"}
                </div>
              ) : (
                <>
                  {documents.map((doc) => (
                    <button
                      key={doc._id}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                        value === doc._id && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => selectDocument(doc)}
                    >
                      <div className="flex items-center gap-2">
                         {doc.isDraft ? (
                           <div title="草稿">
                             <Edit className="h-3 w-3 text-orange-500 flex-shrink-0" />
                           </div>
                         ) : (
                           <div title="已发布">
                             <FileText className="h-3 w-3 text-green-500 flex-shrink-0" />
                           </div>
                         )}
                         <div className="truncate">
                           {doc.title || doc.slug?.current || doc._id}
                         </div>
                       </div>
                      {doc.slug?.current && doc.title && (
                        <div className="text-xs text-muted-foreground truncate">
                          {doc.slug.current}
                        </div>
                      )}
                    </button>
                  ))}
                  
                  {/* 加载更多指示器 */}
                  {isLoadingMore && (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2 text-sm text-muted-foreground">加载更多...</span>
                    </div>
                  )}
                  
                  {/* 已加载完所有数据的提示 */}
                  {!hasMore && documents.length > 6 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t">
                      已显示全部 {total} 个文档
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 点击外部关闭 */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
      </div>
    </div>
  )
}
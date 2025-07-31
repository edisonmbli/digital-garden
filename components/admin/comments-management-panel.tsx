'use client'

import { useState, useTransition } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Pin,
  PinOff,
  Trash2,
  Search,
  User,
  Calendar,
  Hash,
  RefreshCw,
  Camera,
  FileText,
  Reply,
} from 'lucide-react'
import {
  getCommentsForAdminAction,
  batchUpdateCommentsAction,
  updateCommentAction,
  createAuthorReplyAction,
} from '@/lib/admin-actions'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface Comment {
  id: string
  content: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED'
  isPinned: boolean
  isDeleted: boolean
  isAuthorReply: boolean
  parentId: string | null
  createdAt: string | Date
  user: {
    id: string
    name: string | null
    email: string | null
    avatarUrl: string | null
  }
  post: {
    id: string
    contentType: 'photo' | 'log'
    sanityDocumentId: string | null
    photo?: {
      titleJson: Record<string, string> | null
      sanityAssetId: string
    } | null
    logs?: Array<{
      title: string
      slug: string
      language: string
    }>
  }
  _count: {
    replies: number
  }
  replies?: Comment[]
}

interface CommentsManagementPanelProps {
  contentType?: 'photo' | 'log'
  initialComments?: Comment[]
  initialPagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function CommentsManagementPanel({
  contentType,
  initialComments = [],
  initialPagination = { page: 1, limit: 20, total: 0, totalPages: 0 },
}: CommentsManagementPanelProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // 获取当前用户信息
  const { user, isLoaded } = useUser()

  // Tab状态管理
  const [activeTab, setActiveTab] = useState<'photo' | 'log'>(
    contentType || 'photo'
  )

  // 状态管理
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [pagination, setPagination] = useState(initialPagination)
  const [selectedComments, setSelectedComments] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 过滤和搜索状态
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || 'all',
    search: searchParams.get('search') || '',
    sortBy: searchParams.get('sortBy') || 'newest',
    page: parseInt(searchParams.get('page') || '1'),
  })

  // 批量操作状态
  const [batchAction, setBatchAction] = useState<{
    action: 'approve' | 'reject' | 'delete' | null
    reason: string
    isOpen: boolean
  }>({
    action: null,
    reason: '',
    isOpen: false,
  })

  // 作者回复状态
  const [replyAction, setReplyAction] = useState<{
    commentId: string | null
    content: string
    isOpen: boolean
  }>({
    commentId: null,
    content: '',
    isOpen: false,
  })

  // 单条评论操作状态
  const [singleAction, setSingleAction] = useState<{
    commentId: string | null
    action: 'reject' | 'delete' | null
    reason: string
    isOpen: boolean
  }>({
    commentId: null,
    action: null,
    reason: '',
    isOpen: false,
  })

  // 更新 URL 参数
  const updateSearchParams = (newFilters: Partial<typeof filters>) => {
    const params = new URLSearchParams(searchParams)

    Object.entries({ ...filters, ...newFilters }).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.set(key, value.toString())
      } else {
        params.delete(key)
      }
    })

    router.push(`${pathname}?${params.toString()}`)
  }

  // 加载评论数据
  const loadComments = async (newFilters = filters, tabType = activeTab) => {
    setIsLoading(true)
    try {
      const result = await getCommentsForAdminAction({
        contentType: tabType,
        status: newFilters.status as
          | 'PENDING'
          | 'APPROVED'
          | 'REJECTED'
          | 'all',
        search: newFilters.search,
        page: newFilters.page,
        limit: 20,
        sortBy: newFilters.sortBy as 'newest' | 'oldest' | 'status' | 'pinned',
      })

      if (result.success && result.data) {
        setComments(result.data.comments as Comment[])
        setPagination(result.data.pagination)
      } else {
        toast.error(result.error || '加载评论失败')
      }
    } catch {
      toast.error('加载评论失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 处理过滤器变化
  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value, page: 1 }
    setFilters(newFilters)
    updateSearchParams(newFilters)
    loadComments(newFilters)
  }

  // 处理分页
  const handlePageChange = (page: number) => {
    const newFilters = { ...filters, page }
    setFilters(newFilters)
    updateSearchParams(newFilters)
    loadComments(newFilters)
  }

  // 处理tab切换
  const handleTabChange = (tab: 'photo' | 'log') => {
    setActiveTab(tab)
    const newFilters = { ...filters, search: '', page: 1 }
    setFilters(newFilters)
    setSelectedComments([])
    updateSearchParams(newFilters)
    loadComments(newFilters, tab)
  }

  // 刷新评论列表
  const handleRefresh = () => {
    setSelectedComments([])
    loadComments(filters, activeTab)
  }

  // 处理作者回复
  const handleReply = (commentId: string) => {
    const comment = comments.find(c => c.id === commentId)
    if (!comment) return
    
    // 检查是否已有作者回复
    const hasAuthorReply = comments.some(c => 
      c.isAuthorReply && c.parentId === commentId
    )
    
    if (hasAuthorReply) {
      toast.error('该评论已有作者回复')
      return
    }
    
    setReplyAction({
      commentId,
      content: '',
      isOpen: true,
    })
  }

  // 确认作者回复
  const handleConfirmReply = async () => {
    if (!replyAction.commentId || !replyAction.content.trim()) {
      toast.error('回复内容不能为空')
      return
    }

    setIsLoading(true)
    try {
      const result = await createAuthorReplyAction({
        parentCommentId: replyAction.commentId,
        content: replyAction.content.trim(),
      })

      if (result.success) {
        toast.success('回复成功')
        setReplyAction({
          commentId: null,
          content: '',
          isOpen: false,
        })
        loadComments(filters, activeTab)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error('回复失败:', error)
      toast.error('回复失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 单个评论操作
  const handleSingleAction = async (
    commentId: string,
    action: 'approve' | 'reject' | 'delete' | 'pin' | 'unpin',
    reason?: string
  ) => {
    // 对于驳回和删除操作，如果没有提供备注，则打开对话框
    if ((action === 'reject' || action === 'delete') && !reason) {
      setSingleAction({
        commentId,
        action,
        reason: '',
        isOpen: true,
      })
      return
    }

    startTransition(async () => {
      const result = await updateCommentAction({
        commentId,
        action,
        reason,
      })

      if (result.success) {
        toast.success(result.message)
        loadComments(filters, activeTab)
      } else {
        toast.error(result.error)
      }
    })
  }

  // 确认单条评论操作
  const handleConfirmSingleAction = async () => {
    if (!singleAction.commentId || !singleAction.action) return

    startTransition(async () => {
      const result = await updateCommentAction({
        commentId: singleAction.commentId!,
        action: singleAction.action!,
        reason: singleAction.reason || undefined,
      })

      if (result.success) {
        toast.success(result.message)
        loadComments(filters, activeTab)
        setSingleAction({
          commentId: null,
          action: null,
          reason: '',
          isOpen: false,
        })
      } else {
        toast.error(result.error)
      }
    })
  }

  // 批量操作
  const handleBatchAction = async () => {
    if (!batchAction.action || selectedComments.length === 0) return

    startTransition(async () => {
      const result = await batchUpdateCommentsAction({
        commentIds: selectedComments,
        action: batchAction.action!,
        reason: batchAction.reason,
      })

      if (result.success) {
        toast.success(result.message)
        setSelectedComments([])
        setBatchAction({ action: null, reason: '', isOpen: false })
        loadComments(filters, activeTab)
      } else {
        toast.error(result.error)
      }
    })
  }

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedComments(comments.map((c) => c.id))
    } else {
      setSelectedComments([])
    }
  }

  // 获取状态样式
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="text-yellow-600">
            <Clock className="w-3 h-3 mr-1" />
            待审核
          </Badge>
        )
      case 'APPROVED':
        return (
          <Badge variant="outline" className="text-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            已通过
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="outline" className="text-red-600">
            <XCircle className="w-3 h-3 mr-1" />
            已拒绝
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // 获取内容标题
  const getContentTitle = (comment: Comment) => {
    if (comment.post.contentType === 'photo' && comment.post.photo) {
      try {
        const titleData = comment.post.photo.titleJson
        return titleData?.zh || titleData?.en || '无标题照片'
      } catch {
        return '无标题照片'
      }
    } else if (comment.post.contentType === 'log' && comment.post.logs?.length) {
      return comment.post.logs[0].title || '无标题日志'
    }
    return '未知内容'
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Tab切换 */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => handleTabChange(value as 'photo' | 'log')}
      >
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="photo" className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            照片评论
          </TabsTrigger>
          <TabsTrigger value="log" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            日志评论
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {/* 工具栏 */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* 搜索和过滤 */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="搜索评论内容、用户名或邮箱..."
                      value={filters.search}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleFilterChange('search', e.target.value)
                      }
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <select
                  value={filters.status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    handleFilterChange('status', e.target.value)
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">全部状态</option>
                  <option value="PENDING">待审核</option>
                  <option value="APPROVED">已通过</option>
                  <option value="REJECTED">已拒绝</option>
                </select>

                <select
                  value={filters.sortBy}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    handleFilterChange('sortBy', e.target.value)
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="newest">最新</option>
                  <option value="oldest">最早</option>
                  <option value="status">按状态</option>
                  <option value="pinned">置顶优先</option>
                </select>
              </div>

              {/* 批量操作 */}
              {selectedComments.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-blue-700">
                    已选择 {selectedComments.length} 条评论
                  </span>
                  <div className="flex gap-2 ml-auto">
                    <Dialog
                      open={batchAction.isOpen}
                      onOpenChange={(open) =>
                        setBatchAction((prev) => ({ ...prev, isOpen: open }))
                      }
                    >
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setBatchAction((prev) => ({
                              ...prev,
                              action: 'approve',
                              isOpen: true,
                            }))
                          }
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          批量通过
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>批量操作确认</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p>
                            确定要对 {selectedComments.length} 条评论执行&ldquo;
                            {batchAction.action === 'approve'
                              ? '通过'
                              : batchAction.action === 'reject'
                              ? '拒绝'
                              : batchAction.action === 'delete'
                              ? '删除'
                              : batchAction.action === 'pin'
                              ? '置顶'
                              : '取消置顶'}
                            &rdquo;操作吗？
                          </p>

                          {(batchAction.action === 'reject' ||
                            batchAction.action === 'delete') && (
                            <div>
                              <label className="text-sm font-medium">
                                操作原因（可选）
                              </label>
                              <textarea
                                value={batchAction.reason}
                                onChange={(
                                  e: React.ChangeEvent<HTMLTextAreaElement>
                                ) =>
                                  setBatchAction((prev) => ({
                                    ...prev,
                                    reason: e.target.value,
                                  }))
                                }
                                placeholder="请输入操作原因..."
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={3}
                              />
                            </div>
                          )}

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() =>
                                setBatchAction({
                                  action: null,
                                  reason: '',
                                  isOpen: false,
                                })
                              }
                            >
                              取消
                            </Button>
                            <Button
                              onClick={handleBatchAction}
                              disabled={isPending}
                            >
                              确认操作
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setBatchAction({
                          action: 'reject',
                          reason: '',
                          isOpen: true,
                        })
                      }
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      批量拒绝
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setBatchAction({
                          action: 'delete',
                          reason: '',
                          isOpen: true,
                        })
                      }
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      批量删除
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 评论列表 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  评论列表
                </CardTitle>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isLoading}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${
                        isLoading ? 'animate-spin' : ''
                      }`}
                    />
                    刷新
                  </Button>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        selectedComments.length === comments.length &&
                        comments.length > 0
                      }
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleSelectAll(e.target.checked)
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500">全选</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">加载中...</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无评论数据</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments
                    .filter(comment => !comment.isAuthorReply || !comment.parentId) // 过滤掉作为子回复的作者回复
                    .map((comment) => {
                      // 查找该评论的作者回复
                      const authorReply = comments.find(c => 
                        c.isAuthorReply && c.parentId === comment.id
                      )
                      
                      return (
                        <div
                          key={comment.id}
                          className="border rounded-lg overflow-hidden"
                        >
                          {/* 主评论 */}
                          <div className="p-4 space-y-3">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={selectedComments.includes(comment.id)}
                                onChange={(
                                  e: React.ChangeEvent<HTMLInputElement>
                                ) => {
                                  if (e.target.checked) {
                                    setSelectedComments((prev) => [
                                      ...prev,
                                      comment.id,
                                    ])
                                  } else {
                                    setSelectedComments((prev) =>
                                      prev.filter((id) => id !== comment.id)
                                    )
                                  }
                                }}
                                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />

                              <div className="flex-1 space-y-2">
                                {/* 评论内容 */}
                                <div className="bg-gray-50 rounded p-3">
                                  <p className="text-gray-900">{comment.content}</p>
                                </div>

                                {/* 元信息 */}
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    <span>
                                      {comment.user.name || comment.user.email}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                      {formatDistanceToNow(
                                        new Date(comment.createdAt),
                                        { addSuffix: true, locale: zhCN }
                                      )}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <Hash className="w-4 h-4" />
                                    <span>{getContentTitle(comment)}</span>
                                  </div>

                                  {comment._count.replies > 0 && (
                                    <span>{comment._count.replies} 条回复</span>
                                  )}
                                </div>

                                {/* 状态和操作 */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {getStatusBadge(comment.status)}
                                    {comment.isPinned && (
                                      <Badge
                                        variant="outline"
                                        className="text-blue-600"
                                      >
                                        <Pin className="w-3 h-3 mr-1" />
                                        置顶
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {comment.status === 'PENDING' && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            handleSingleAction(comment.id, 'approve')
                                          }
                                          disabled={
                                            comment.status !== 'PENDING' || isPending
                                          }
                                        >
                                          <CheckCircle className="w-4 h-4 mr-1" />
                                          通过
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            handleSingleAction(comment.id, 'reject')
                                          }
                                          disabled={
                                            comment.status !== 'PENDING' || isPending
                                          }
                                        >
                                          <XCircle className="w-4 h-4 mr-1" />
                                          拒绝
                                        </Button>
                                      </>
                                    )}

                                    {comment.status === 'APPROVED' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleSingleAction(
                                            comment.id,
                                            comment.isPinned ? 'unpin' : 'pin'
                                          )
                                        }
                                        disabled={isPending}
                                      >
                                        {comment.isPinned ? (
                                          <>
                                            <PinOff className="w-4 h-4 mr-1" />
                                            取消置顶
                                          </>
                                        ) : (
                                          <>
                                            <Pin className="w-4 h-4 mr-1" />
                                            置顶
                                          </>
                                        )}
                                      </Button>
                                    )}

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleSingleAction(comment.id, 'delete')
                                      }
                                      disabled={comment.status === 'DELETED' || isPending}
                                    >
                                      <Trash2 className="w-4 h-4 mr-1" />
                                      删除
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleReply(comment.id)}
                                      disabled={isPending || !!authorReply}
                                      title={authorReply ? '该评论已有作者回复' : '作者回复'}
                                    >
                                      <Reply className="w-4 h-4 mr-1" />
                                      作者回复
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 作者回复 */}
                          {authorReply && (
                            <div className="border-t bg-blue-50 p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-5 h-5 flex items-center justify-center">
                                  <Reply className="w-4 h-4 text-blue-600" />
                                </div>
                                
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="default" className="bg-blue-600 text-white text-xs">
                                      作者回复
                                    </Badge>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <User className="w-4 h-4" />
                                      <span>{authorReply.user.name || authorReply.user.email}</span>
                                      <Calendar className="w-4 h-4" />
                                      <span>
                                        {formatDistanceToNow(
                                          new Date(authorReply.createdAt),
                                          { addSuffix: true, locale: zhCN }
                                        )}
                                      </span>
                                      {getStatusBadge(authorReply.status)}
                                    </div>
                                  </div>

                                  <div className="bg-white rounded p-3 border">
                                    <p className="text-gray-900">{authorReply.content}</p>
                                  </div>

                                  <div className="flex items-center justify-end gap-1">
                                    {authorReply.status === 'PENDING' && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            handleSingleAction(authorReply.id, 'approve')
                                          }
                                          disabled={isPending}
                                        >
                                          <CheckCircle className="w-4 h-4 mr-1" />
                                          通过
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            handleSingleAction(authorReply.id, 'reject')
                                          }
                                          disabled={isPending}
                                        >
                                          <XCircle className="w-4 h-4 mr-1" />
                                          拒绝
                                        </Button>
                                      </>
                                    )}

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleSingleAction(authorReply.id, 'delete')
                                      }
                                      disabled={authorReply.status === 'DELETED' || isPending}
                                    >
                                      <Trash2 className="w-4 h-4 mr-1" />
                                      删除
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={true}
                                      className="opacity-50 cursor-not-allowed"
                                      title="作者回复不支持置顶"
                                    >
                                      <Pin className="w-4 h-4 mr-1" />
                                      置顶
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={true}
                                      className="opacity-50 cursor-not-allowed"
                                      title="作者回复不支持再次回复"
                                    >
                                      <Reply className="w-4 h-4 mr-1" />
                                      回复
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              )}

              {/* 分页 */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-gray-500">
                    共 {pagination.total} 条评论，第 {pagination.page} /{' '}
                    {pagination.totalPages} 页
                  </p>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1 || isLoading}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={
                        pagination.page >= pagination.totalPages || isLoading
                      }
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 单条评论操作对话框 */}
          <Dialog
            open={singleAction.isOpen}
            onOpenChange={(open) =>
              setSingleAction((prev) => ({ ...prev, isOpen: open }))
            }
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {singleAction.action === 'reject' ? '拒绝评论' : '删除评论'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p>
                  确定要{singleAction.action === 'reject' ? '拒绝' : '删除'}
                  这条评论吗？
                </p>

                <div>
                  <label className="text-sm font-medium">
                    {singleAction.action === 'reject' ? '拒绝' : '删除'}
                    原因（可选）
                  </label>
                  <textarea
                    value={singleAction.reason}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setSingleAction((prev) => ({
                        ...prev,
                        reason: e.target.value,
                      }))
                    }
                    placeholder={`请输入${
                      singleAction.action === 'reject' ? '拒绝' : '删除'
                    }原因...`}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setSingleAction({
                        commentId: null,
                        action: null,
                        reason: '',
                        isOpen: false,
                      })
                    }
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleConfirmSingleAction}
                    disabled={isPending}
                  >
                    确认{singleAction.action === 'reject' ? '拒绝' : '删除'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* 作者回复对话框 */}
          <Dialog
            open={replyAction.isOpen}
            onOpenChange={(open) =>
              setReplyAction((prev) => ({ ...prev, isOpen: open }))
            }
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>作者回复</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">回复内容</label>
                  <textarea
                    value={replyAction.content}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setReplyAction((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    placeholder="请输入回复内容..."
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setReplyAction({
                        commentId: null,
                        content: '',
                        isOpen: false,
                      })
                    }
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleConfirmReply}
                    disabled={isPending || !replyAction.content.trim()}
                  >
                    发送回复
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  )
}

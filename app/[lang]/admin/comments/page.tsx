import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Pin,
} from 'lucide-react'
import {
  getCommentStatsAction,
  getCommentsForAdminAction,
} from '@/lib/admin-actions'
import { CommentsManagementPanel } from '@/components/admin/comments-management-panel'
import { LucideIcon } from 'lucide-react'

// 统计卡片组件
function StatCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  description,
}: {
  title: string
  value: number
  icon: LucideIcon
  color?: 'blue' | 'yellow' | 'green' | 'red'
  description?: string
}) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    green: 'text-green-600 bg-green-100',
    red: 'text-red-600 bg-red-100',
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {value.toLocaleString()}
            </p>
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 加载状态组件
function LoadingStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// 统计数据组件
async function CommentStats() {
  const statsResult = await getCommentStatsAction()

  if (!statsResult.success || !statsResult.data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">统计数据加载失败: {statsResult.error}</p>
        </CardContent>
      </Card>
    )
  }

  const { total, pending, approved, rejected, pinned } = statsResult.data

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <StatCard
        title="总评论数"
        value={total}
        icon={MessageSquare}
        color="blue"
        description="所有评论"
      />
      <StatCard
        title="待审核"
        value={pending}
        icon={Clock}
        color="yellow"
        description="需要处理"
      />
      <StatCard
        title="已通过"
        value={approved}
        icon={CheckCircle}
        color="green"
        description="已发布"
      />
      <StatCard
        title="已拒绝"
        value={rejected}
        icon={XCircle}
        color="red"
        description="已拒绝"
      />
      <StatCard
        title="精选评论"
        value={pinned}
        icon={Pin}
        color="blue"
        description="置顶显示"
      />
    </div>
  )
}

// 评论管理面板包装器
async function CommentsPanel({
  contentType,
}: {
  contentType?: 'photo' | 'log'
}) {
  // 获取初始数据
  const commentsResult = await getCommentsForAdminAction({
    contentType,
    status: 'all',
    page: 1,
    limit: 20,
    sortBy: 'newest',
  })

  // 类型转换以匹配 Comment 接口
  const initialComments =
    commentsResult.success && commentsResult.data?.comments
      ? commentsResult.data.comments.map((comment) => ({
          ...comment,
          post: {
            ...comment.post,
            contentType: comment.post.contentType as 'photo' | 'log',
            photo: comment.post.photo
              ? {
                  titleJson: comment.post.photo.titleJson
                    ? ((typeof comment.post.photo.titleJson === 'string'
                        ? JSON.parse(comment.post.photo.titleJson)
                        : comment.post.photo.titleJson) as Record<
                        string,
                        string
                      >)
                    : null,
                  sanityAssetId: comment.post.photo.sanityAssetId || '',
                }
              : null,
            logs: comment.post.logs || [],
          },
        }))
      : []

  const initialPagination = commentsResult.success
    ? commentsResult.data?.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      }
    : { page: 1, limit: 20, total: 0, totalPages: 0 }

  return (
    <CommentsManagementPanel
      contentType={contentType}
      initialComments={initialComments}
      initialPagination={initialPagination}
    />
  )
}

// 加载状态的评论面板
function LoadingCommentsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>评论列表</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function CommentsManagementPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* 统计面板 */}
      <div className="max-w-5xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">评论统计</h2>
        <Suspense fallback={<LoadingStats />}>
          <CommentStats />
        </Suspense>
      </div>

      {/* 评论管理标签页 */}
      <div>
        <Tabs defaultValue="all" className="space-y-6 ">
          <TabsContent value="all" className="space-y-6">
            <Suspense fallback={<LoadingCommentsPanel />}>
              <CommentsPanel />
            </Suspense>
          </TabsContent>

          <TabsContent value="photo" className="space-y-6">
            <Suspense fallback={<LoadingCommentsPanel />}>
              <CommentsPanel contentType="photo" />
            </Suspense>
          </TabsContent>

          <TabsContent value="log" className="space-y-6">
            <Suspense fallback={<LoadingCommentsPanel />}>
              <CommentsPanel contentType="log" />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

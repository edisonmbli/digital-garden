import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WarmupControlPanel } from '@/app/ui/admin/warmup-control-panel'
import { WarmupStats } from '@/app/ui/admin/warmup-stats'

export default function WarmupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">图片缓存预热</h1>
        <p className="text-muted-foreground">
          手动触发图片缓存预热，提升用户访问体验
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>预热控制</CardTitle>
            <CardDescription>
              选择预热类型和参数，手动触发缓存预热
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>加载中...</div>}>
              <WarmupControlPanel />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>预热统计</CardTitle>
            <CardDescription>
              查看最近的预热任务执行情况
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>加载中...</div>}>
              <WarmupStats />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const metadata = {
  title: '图片缓存预热 - 管理员面板',
  description: '手动触发图片缓存预热，提升用户访问体验',
}
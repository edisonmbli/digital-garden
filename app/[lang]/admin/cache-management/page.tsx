import { Suspense } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Database } from 'lucide-react'
import { CacheMonitoring } from '@/components/cache-monitoring'
import { CacheManagementPanel } from '../../../../components/admin/cache-management-panel'



export default function CacheManagementPage() {

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">缓存管理</h1>
          <p className="text-muted-foreground">统一管理和监控系统缓存</p>
        </div>
        <Badge variant="outline" className="text-body-sm">
          <Database className="w-4 h-4 mr-1" />
          缓存管理
        </Badge>
      </div>

      <Tabs defaultValue="monitoring" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monitoring">监控概览</TabsTrigger>
          <TabsTrigger value="operations">缓存操作</TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-4">
          <Suspense fallback={<div>加载中...</div>}>
            <CacheMonitoring />
          </Suspense>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <Suspense fallback={<div>加载中...</div>}>
            <CacheManagementPanel />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
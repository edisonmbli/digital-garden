'use client'

import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function DebugUserPage() {
  const { user, isLoaded, isSignedIn } = useUser()

  if (!isLoaded) {
    return <div className="p-8">加载中...</div>
  }

  if (!isSignedIn) {
    return <div className="p-8">用户未登录</div>
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">用户调试信息</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>用户ID:</strong> {user?.id}
          </div>
          <div>
            <strong>邮箱:</strong> {user?.primaryEmailAddress?.emailAddress}
          </div>
          <div>
            <strong>用户名:</strong> {user?.username || '未设置'}
          </div>
          <div>
            <strong>姓名:</strong> {user?.fullName || '未设置'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>公共元数据 (publicMetadata)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <strong>角色:</strong> 
              <Badge variant={user?.publicMetadata?.role === 'admin' ? 'default' : 'secondary'} className="ml-2">
                {user?.publicMetadata?.role as string || '未设置'}
              </Badge>
            </div>
            <div>
              <strong>完整 publicMetadata:</strong>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-auto">
                {JSON.stringify(user?.publicMetadata, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>不安全元数据 (unsafeMetadata)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="p-4 bg-gray-100 rounded text-sm overflow-auto">
            {JSON.stringify(user?.unsafeMetadata, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>完整用户对象</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="p-4 bg-gray-100 rounded text-sm overflow-auto max-h-96">
            {JSON.stringify(user, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
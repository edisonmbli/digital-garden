'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import { SignIn, SignInButton } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface ConfigCheck {
  name: string
  status: 'success' | 'error' | 'warning'
  message: string
  details?: string
}

export default function TestOAuthPage() {
  const { isLoaded, userId, sessionId } = useAuth()
  const { user } = useUser()
  const [configChecks, setConfigChecks] = useState<ConfigCheck[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)

  const checkConfiguration = async () => {
    setIsChecking(true)
    const checks: ConfigCheck[] = []

    // 检查环境变量
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    if (publishableKey) {
      checks.push({
        name: 'Clerk Publishable Key',
        status: 'success',
        message: '已配置',
        details: `${publishableKey.substring(0, 20)}...`
      })
    } else {
      checks.push({
        name: 'Clerk Publishable Key',
        status: 'error',
        message: '未配置',
        details: '缺少 NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
      })
    }

    // 检查 Clerk 加载状态
    if (isLoaded) {
      checks.push({
        name: 'Clerk 加载状态',
        status: 'success',
        message: 'Clerk 已成功加载'
      })
    } else {
      checks.push({
        name: 'Clerk 加载状态',
        status: 'warning',
        message: 'Clerk 正在加载中...'
      })
    }

    // 检查用户状态
    if (userId) {
      checks.push({
        name: '用户认证状态',
        status: 'success',
        message: '用户已登录',
        details: `用户ID: ${userId}`
      })
    } else {
      checks.push({
        name: '用户认证状态',
        status: 'warning',
        message: '用户未登录'
      })
    }

    // 检查会话状态
    if (sessionId) {
      checks.push({
        name: '会话状态',
        status: 'success',
        message: '会话有效',
        details: `会话ID: ${sessionId.substring(0, 20)}...`
      })
    } else {
      checks.push({
        name: '会话状态',
        status: 'warning',
        message: '无有效会话'
      })
    }

    // 检查用户信息
    if (user) {
      checks.push({
        name: '用户信息',
        status: 'success',
        message: '用户信息已加载',
        details: `邮箱: ${user.primaryEmailAddress?.emailAddress || '未设置'}`
      })
    }

    // 检查 OAuth 提供商（通过检查 Clerk 的配置）
    try {
      // 这里我们检查当前页面是否能访问 Clerk 的配置
      const clerkConfig = (window as unknown as { __clerk_publishable_key?: string }).__clerk_publishable_key
      if (clerkConfig) {
        checks.push({
          name: 'Clerk 客户端配置',
          status: 'success',
          message: 'Clerk 客户端配置正常'
        })
      }
    } catch (error) {
      checks.push({
        name: 'Clerk 客户端配置',
        status: 'error',
        message: 'Clerk 客户端配置异常',
        details: (error as Error).message
      })
    }

    setConfigChecks(checks)
    setIsChecking(false)
  }

  useEffect(() => {
    if (isLoaded) {
      checkConfiguration()
    }
  }, [isLoaded, userId, sessionId, user])

  const getStatusIcon = (status: ConfigCheck['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: ConfigCheck['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">正常</Badge>
      case 'error':
        return <Badge variant="destructive">错误</Badge>
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">警告</Badge>
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-display-md">OAuth 配置测试</h1>
        <p className="text-muted-foreground">
          检查 Clerk OAuth 配置和认证状态
        </p>
      </div>

      <div className="flex justify-center gap-4">
        <Button 
          onClick={checkConfiguration} 
          disabled={isChecking}
          className="flex items-center gap-2"
        >
          {isChecking && <RefreshCw className="h-4 w-4 animate-spin" />}
          重新检查配置
        </Button>
        
        {!userId && (
          <Button 
            onClick={() => setShowSignIn(!showSignIn)}
            variant="outline"
          >
            {showSignIn ? '隐藏登录' : '显示登录'}
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>配置检查结果</CardTitle>
            <CardDescription>
              检查 Clerk 和 OAuth 相关配置
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {configChecks.map((check, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                {getStatusIcon(check.status)}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-body-base font-medium">{check.name}</h4>
                    {getStatusBadge(check.status)}
                  </div>
                  <p className="text-body-sm text-muted-foreground">{check.message}</p>
                  {check.details && (
                    <p className="text-body-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                      {check.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>认证测试</CardTitle>
            <CardDescription>
              测试 OAuth 登录功能
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userId ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="text-body-base font-medium text-green-800">登录成功！</h4>
                  <p className="text-body-sm text-green-600 mt-1">
                    用户已通过 Clerk 成功认证
                  </p>
                </div>
                
                {user && (
                  <div className="space-y-2">
                    <h5 className="text-body-base font-medium">用户信息：</h5>
                    <div className="text-body-sm space-y-1">
                      <p><strong>ID:</strong> {user.id}</p>
                      <p><strong>邮箱:</strong> {user.primaryEmailAddress?.emailAddress}</p>
                      <p><strong>姓名:</strong> {user.fullName || '未设置'}</p>
                      <p><strong>创建时间:</strong> {user.createdAt?.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="text-body-base font-medium text-yellow-800">未登录</h4>
                  <p className="text-body-sm text-yellow-600 mt-1">
                    请使用下方的登录按钮测试 OAuth 功能
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <SignInButton mode="modal">
                    <Button>模态框登录</Button>
                  </SignInButton>
                  
                  <SignInButton>
                    <Button variant="outline">跳转登录</Button>
                  </SignInButton>
                </div>
                
                {showSignIn && (
                  <div className="mt-4 p-4 border rounded-lg">
                    <h5 className="text-body-base font-medium mb-3">内嵌登录组件：</h5>
                    <SignIn 
                      routing="hash"
                      appearance={{
                        elements: {
                          rootBox: 'w-full',
                          card: 'shadow-none border-0',
                          socialButtonsBlockButton: 'border border-input hover:bg-accent',
                          formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>故障排除建议</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-body-sm space-y-2">
            <h5 className="text-body-base font-medium">如果 OAuth 登录失败，请检查：</h5>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Clerk Dashboard 中的 OAuth 提供商配置（Google、GitHub）</li>
              <li>Google Cloud Console 中的 OAuth 客户端配置</li>
              <li>GitHub OAuth App 的回调 URL 设置</li>
              <li>环境变量是否正确配置</li>
              <li>域名和重定向 URI 是否匹配</li>
            </ul>
          </div>
          
          <div className="text-body-sm space-y-2">
            <h5 className="text-body-base font-medium">常见错误解决方案：</h5>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>Error 400: invalid_request</strong> - 检查 client_id 配置</li>
              <li><strong>redirect_uri_mismatch</strong> - 检查重定向 URI 配置</li>
              <li><strong>access_denied</strong> - 检查 OAuth 应用权限设置</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
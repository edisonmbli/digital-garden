// app/ui/admin/admin-panel-lazy.tsx
'use client'

import { Suspense, lazy } from 'react'
// 动态导入管理员组件 - 这些组件将在需要时创建
const AdminPanel = lazy(() => 
  import('@/app/[lang]/admin/page').then(module => ({ default: module.default }))
)

// 加载指示器组件
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="ml-2 text-muted-foreground">加载管理面板...</span>
    </div>
  )
}

// 懒加载的管理员面板组件
export function LazyAdminPanel() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdminPanel />
    </Suspense>
  )
}

// 权限检查高阶组件
export function withAdminAuth<T extends object>(Component: React.ComponentType<T>) {
  return function AdminAuthWrapper(props: T) {
    // 这里可以添加权限检查逻辑
    // 如果不是管理员，返回null或重定向
    return <Component {...props} />
  }
}
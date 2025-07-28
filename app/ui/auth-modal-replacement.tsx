'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect } from 'react'

interface AuthModalReplacementProps {
  isOpen: boolean
  onClose: () => void
  onAuthSuccess?: () => void
  action?: string // 添加action属性，用于传递上下文信息
}

export function AuthModalReplacement({ 
  isOpen, 
  onClose, 
  onAuthSuccess
}: AuthModalReplacementProps) {
  const { user, isLoaded } = useUser()
  
  // 当模态框打开时，直接跳转到登录页面
  useEffect(() => {
    if (isOpen && isLoaded && !user) {
      // 跳转到我们的自定义登录页面，并传递上下文参数
      const currentUrl = new URL(window.location.href)
      
      // 获取当前语言路径
      const pathSegments = currentUrl.pathname.split('/')
      const lang = pathSegments[1] || 'zh' // 默认中文
      
      const signInUrl = new URL(`/${lang}/sign-in`, window.location.origin)
      
      // 添加上下文参数
      signInUrl.searchParams.set('clerk_context', 'likePhoto')
      // 添加回调URL
      signInUrl.searchParams.set('redirect_url', currentUrl.toString())
      
      // 跳转到自定义登录页面
      window.location.href = signInUrl.toString()
      
      // 关闭当前模态框状态
      onClose()
    }
  }, [isOpen, isLoaded, user, onClose])

  // 监听用户登录状态变化
  useEffect(() => {
    if (isLoaded && user && onAuthSuccess) {
      // 用户已登录，执行成功回调
      onAuthSuccess()
    }
  }, [isLoaded, user, onAuthSuccess])

  // 这个组件不渲染任何UI，只负责逻辑处理
  return null
}
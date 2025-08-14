'use client'

import { SignIn } from '@clerk/nextjs'
import { useEffect } from 'react'
import { monitorOAuthError, monitorClerkAuthError } from '@/lib/sentry-monitoring-strategy'

interface MonitoredSignInProps {
  appearance?: {
    elements?: Record<string, string>
  }
  redirectUrl?: string
  routing?: 'hash' | 'virtual'
}

export function MonitoredSignIn(props: MonitoredSignInProps) {
  useEffect(() => {
    // 监听 URL 变化，检测 OAuth 错误
    const checkForOAuthErrors = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const error = urlParams.get('error')
      const errorDescription = urlParams.get('error_description')
      const state = urlParams.get('state')
      
      if (error) {
        // 检测 OAuth 提供商
        let provider: 'google' | 'github' | 'other' = 'other'
        if (errorDescription?.toLowerCase().includes('google') || state?.includes('google')) {
          provider = 'google'
        } else if (errorDescription?.toLowerCase().includes('github') || state?.includes('github')) {
          provider = 'github'
        }
        
        // 上报 OAuth 错误
        monitorOAuthError(new Error(`OAuth Error: ${error}`), {
          provider,
          errorCode: error,
          errorDescription: errorDescription || undefined,
          userAgent: navigator.userAgent,
          ip: undefined // 客户端无法获取真实IP
        })
      }
    }
    
    // 检查当前URL
    checkForOAuthErrors()
    
    // 监听 popstate 事件（浏览器前进后退）
    window.addEventListener('popstate', checkForOAuthErrors)
    
    // 监听 Clerk 的错误事件
    const handleClerkError = (event: Event) => {
      const customEvent = event as CustomEvent
      const error = customEvent.detail
      monitorClerkAuthError(new Error(error.message || 'Clerk authentication error'), {
        authFlow: 'sign-in',
        errorType: error.code || error.type,
        pathname: window.location.pathname
      })
    }
    
    // 添加 Clerk 错误监听器
    window.addEventListener('clerk:error', handleClerkError)
    
    return () => {
      window.removeEventListener('popstate', checkForOAuthErrors)
      window.removeEventListener('clerk:error', handleClerkError)
    }
  }, [])
  
  return <SignIn {...props} />
}
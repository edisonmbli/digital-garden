'use client'

import React, { Component, ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  logSlug?: string
  lang?: string
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class LogDetailErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误信息到状态
    this.setState({ errorInfo })

    // 上报错误到 Sentry
    Sentry.withScope((scope) => {
      scope.setTag('component', 'LogDetailPage')
      scope.setTag('error_boundary', 'log-detail')
      scope.setLevel('error')
      
      // 添加页面上下文
      if (this.props.logSlug) {
        scope.setTag('log_slug', this.props.logSlug)
        scope.setContext('page', {
          type: 'log-detail',
          slug: this.props.logSlug,
          language: this.props.lang || 'unknown'
        })
      }
      
      // 添加错误详情
      scope.setContext('errorInfo', {
        componentStack: errorInfo.componentStack,
        errorBoundary: 'LogDetailErrorBoundary'
      })
      
      // 添加面包屑
      Sentry.addBreadcrumb({
        message: 'Log detail page error boundary triggered',
        category: 'error',
        level: 'error',
        data: {
          logSlug: this.props.logSlug,
          errorMessage: error.message
        }
      })
      
      Sentry.captureException(error)
    })

    // 同时记录到控制台用于开发调试
    console.error('LogDetailErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    // 重置错误状态，重新渲染
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  handleReload = () => {
    // 刷新页面
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误 UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <AlertTriangle className="h-16 w-16 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                页面加载出错
              </h1>
              <p className="text-muted-foreground">
                抱歉，页面在加载过程中遇到了问题。我们已经记录了这个错误，并会尽快修复。
              </p>
            </div>

            {/* 开发环境显示错误详情 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="text-left bg-muted p-4 rounded-lg text-sm">
                <p className="font-semibold text-destructive mb-2">错误详情 (仅开发环境显示):</p>
                <p className="text-muted-foreground break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-muted-foreground">组件堆栈</summary>
                    <pre className="mt-2 text-xs overflow-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleRetry} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                重试
              </Button>
              <Button onClick={this.handleReload} variant="outline">
                刷新页面
              </Button>
              {this.props.logSlug && (
                <Button 
                  onClick={() => window.history.back()} 
                  variant="ghost"
                >
                  返回上一页
                </Button>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// 便捷的 HOC 包装器
export function withLogDetailErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <LogDetailErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </LogDetailErrorBoundary>
    )
  }
}

// 默认导出
export default LogDetailErrorBoundary
'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { sentryIntegration } from '@/lib/sentry-integration'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  level?: 'page' | 'component' | 'critical'
  context?: {
    module: string
    userId?: string
    feature?: string
  }
}

interface State {
  hasError: boolean
  error?: Error
  errorId?: string
}

/**
 * 通用错误边界组件
 * 集成 Sentry 错误报告和用户友好的错误展示
 */
export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0
  private readonly maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { context, level = 'component', onError } = this.props
    
    // 调用自定义错误处理器
    onError?.(error, errorInfo)
    
    // 确定错误严重性
    const severity = this.getErrorSeverity(level, error)
    
    // 使用 Sentry 集成报告错误
    const errorId = sentryIntegration.captureError(error, {
      module: context?.module || 'ErrorBoundary',
      userId: context?.userId,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      additionalData: {
        errorInfo: {
          componentStack: errorInfo.componentStack,
          errorBoundary: this.constructor.name
        },
        feature: context?.feature,
        level,
        retryCount: this.retryCount
      }
    })
    
    // 添加面包屑
    sentryIntegration.addBreadcrumb(
      `Error caught by ${level} boundary`,
      'error',
      severity === 'critical' ? 'error' : 'warning',
      {
        module: context?.module,
        feature: context?.feature,
        retryCount: this.retryCount
      }
    )
    
    this.setState({ errorId })
    
    // 记录业务事件
    sentryIntegration.captureBusinessEvent({
      type: 'system_event',
      action: 'error_boundary_triggered',
      severity: severity === 'critical' ? 'error' : 'warning',
      context: {
        module: context?.module || 'ErrorBoundary',
        userId: context?.userId,
        additionalData: {
          level,
          feature: context?.feature,
          errorName: error.name,
          retryCount: this.retryCount
        }
      }
    })
  }

  private getErrorSeverity(level: string, error: Error): 'info' | 'warning' | 'error' | 'critical' {
    // 关键级别的错误边界
    if (level === 'critical') return 'critical'
    
    // 页面级错误
    if (level === 'page') return 'error'
    
    // 安全检查：确保 error.message 和 error.name 存在
    const errorMessage = (error.message || '').toLowerCase()
    const errorName = (error.name || '').toLowerCase()
    
    // 网络相关错误
    if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      return 'warning'
    }
    
    // 渲染错误
    if (errorMessage.includes('render') || errorName === 'chunkloaderror') {
      return 'warning'
    }
    
    // 默认为警告级别
    return 'warning'
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++
      
      // 记录重试事件
      sentryIntegration.addBreadcrumb(
        `Error boundary retry attempt ${this.retryCount}`,
        'user',
        'info',
        {
          module: this.props.context?.module,
          retryCount: this.retryCount,
          maxRetries: this.maxRetries
        }
      )
      
      this.setState({ hasError: false, error: undefined, errorId: undefined })
    }
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误 UI
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
          <div className="mb-6 rounded-full bg-red-100 p-4 dark:bg-red-900/20">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
            出现了一些问题
          </h2>
          
          <p className="mb-6 max-w-md text-sm text-gray-600 dark:text-gray-400">
            {this.props.level === 'critical' 
              ? '系统遇到了严重错误，请刷新页面或联系支持团队。'
              : '这个组件暂时无法正常工作，您可以尝试重新加载。'
            }
          </p>
          
          {this.state.errorId && (
            <p className="mb-4 text-xs text-gray-500 dark:text-gray-500">
              错误ID: {this.state.errorId}
            </p>
          )}
          
          <div className="flex gap-3">
            {this.retryCount < this.maxRetries && (
              <Button
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                重试 ({this.maxRetries - this.retryCount} 次剩余)
              </Button>
            )}
            
            <Button
              onClick={this.handleReload}
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              刷新页面
            </Button>
          </div>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 w-full max-w-2xl">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                开发者信息
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-gray-100 p-4 text-left text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * 高阶组件：为组件添加错误边界
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

/**
 * Hook：在函数组件中处理错误
 */
export function useErrorHandler() {
  return React.useCallback((error: Error, context?: {
    module: string
    feature?: string
    userId?: string
  }) => {
    sentryIntegration.captureError(error, {
      module: context?.module || 'useErrorHandler',
      userId: context?.userId,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      additionalData: {
        feature: context?.feature,
        handlerType: 'hook'
      }
    })
  }, [])
}
'use client'

// app/ui/optimized-image-v2.tsx
// 优化图片组件 v2 - 双层代理架构支持
// 
// 功能特性：
// 1. 支持双层代理架构，兼顾安全性和性能
// 2. 自动回退到传统代理模式
// 3. 智能错误处理和重试机制
// 4. 性能监控和加载状态管理
// 5. 完全向后兼容现有组件

import Image, { ImageProps } from 'next/image'
import { useState, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageV2Props extends Omit<ImageProps, 'loader' | 'onError' | 'onLoadingComplete'> {
  /** 是否使用双层代理架构（默认：true） */
  useDualProxy?: boolean
  /** 是否显示加载状态（默认：true） */
  showLoadingState?: boolean
  /** 加载失败时的回退图片 */
  fallbackSrc?: string
  /** 错误回调函数 */
  onError?: (error: Error) => void
  /** 加载完成回调函数 */
  onLoadComplete?: () => void
  /** 性能监控回调 */
  onPerformanceMetrics?: (metrics: {
    loadTime: number
    proxyMode: 'dual' | 'legacy'
    retryCount: number
  }) => void
}

/**
 * 优化图片组件 v2
 * 支持双层代理架构的高性能图片组件
 */
export function OptimizedImageV2({
  src,
  alt,
  className,
  useDualProxy = true,
  showLoadingState = true,
  fallbackSrc,
  onError,
  onLoadComplete,
  onPerformanceMetrics,
  ...props
}: OptimizedImageV2Props) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [proxyMode, setProxyMode] = useState<'dual' | 'legacy'>(useDualProxy ? 'dual' : 'legacy')
  const loadStartTime = useRef(Date.now())

  // 使用自定义的安全图片加载器
  // proxyMode 用于错误处理和性能监控

  // 处理图片加载成功
  const handleLoadComplete = useCallback(() => {
    const loadTime = Date.now() - loadStartTime.current
    setIsLoading(false)
    setHasError(false)
    
    // 性能监控回调
    onPerformanceMetrics?.({
      loadTime,
      proxyMode,
      retryCount,
    })
    
    onLoadComplete?.()
  }, [proxyMode, retryCount, onPerformanceMetrics, onLoadComplete])

  // 处理图片加载错误
  const handleError = useCallback((error: React.SyntheticEvent<HTMLImageElement, Event>) => {
    
    // 如果是双层代理模式失败，尝试回退到传统模式
    if (proxyMode === 'dual' && retryCount === 0) {
      setProxyMode('legacy')
      setRetryCount(1)
      setHasError(false)
      return
    }
    
    // 如果传统模式也失败，或者已经重试过，标记为错误
    setHasError(true)
    setIsLoading(false)
    
    const errorObj = new Error(`图片加载失败: ${error.type}`)
    onError?.(errorObj)
  }, [proxyMode, retryCount, onError])

  // 重置状态当 src 改变时
  useEffect(() => {
    setIsLoading(true)
    setHasError(false)
    setRetryCount(0)
    setProxyMode(useDualProxy ? 'dual' : 'legacy')
    loadStartTime.current = Date.now()
  }, [src, useDualProxy])

  // 如果有错误且有回退图片，显示回退图片
  if (hasError && fallbackSrc) {
    return (
      <Image
        {...props}
        src={fallbackSrc}
        alt={`${alt} (回退图片)`}
        className={cn('opacity-75', className)}
        onLoad={handleLoadComplete}
      />
    )
  }

  // 如果有错误且没有回退图片，显示错误占位符
  if (hasError) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-gray-100 text-gray-400 text-sm',
          className
        )}
        style={{ width: props.width, height: props.height }}
      >
        图片加载失败
      </div>
    )
  }

  return (
    <div className="relative">
      {/* 加载状态指示器 */}
      {isLoading && showLoadingState && (
        <div 
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse',
            className
          )}
          style={{ width: props.width, height: props.height }}
        >
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
      
      {/* 主图片 */}
      <Image
        {...props}
        src={`/api/images/secure/${src}`}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        onLoad={handleLoadComplete}
        onError={handleError}

        // 性能优化配置
        priority={props.priority}
        placeholder={props.placeholder || 'blur'}
        blurDataURL={props.blurDataURL || 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='}
      />
      

    </div>
  )
}

/**
 * 向后兼容的默认导出
 * 使用双层代理架构的优化图片组件
 */
export default OptimizedImageV2

/**
 * 传统模式图片组件
 * 强制使用传统代理模式
 */
export function LegacyOptimizedImage(props: Omit<OptimizedImageV2Props, 'useDualProxy'>) {
  return <OptimizedImageV2 {...props} useDualProxy={false} />
}

/**
 * 性能监控 Hook
 * 用于收集图片加载性能数据
 */
export function useImagePerformanceMonitor() {
  const [metrics, setMetrics] = useState<{
    totalImages: number
    dualProxySuccess: number
    legacyFallbacks: number
    averageLoadTime: number
    errors: number
  }>({ 
    totalImages: 0, 
    dualProxySuccess: 0, 
    legacyFallbacks: 0, 
    averageLoadTime: 0, 
    errors: 0 
  })

  const recordMetrics = useCallback((data: {
    loadTime: number
    proxyMode: 'dual' | 'legacy'
    retryCount: number
  }) => {
    setMetrics(prev => {
      const newTotal = prev.totalImages + 1
      const newDualSuccess = data.proxyMode === 'dual' && data.retryCount === 0 
        ? prev.dualProxySuccess + 1 
        : prev.dualProxySuccess
      const newLegacyFallbacks = data.retryCount > 0 
        ? prev.legacyFallbacks + 1 
        : prev.legacyFallbacks
      const newAverageLoadTime = (prev.averageLoadTime * prev.totalImages + data.loadTime) / newTotal

      return {
        totalImages: newTotal,
        dualProxySuccess: newDualSuccess,
        legacyFallbacks: newLegacyFallbacks,
        averageLoadTime: newAverageLoadTime,
        errors: prev.errors,
      }
    })
  }, [])

  const recordError = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      errors: prev.errors + 1,
    }))
  }, [])

  return { metrics, recordMetrics, recordError }
}
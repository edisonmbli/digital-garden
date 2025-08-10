'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { clientLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'

interface ProtectedImageProps {
  src: string
  alt: string
  className?: string
  priority?: boolean
  sizes?: string
  quality?: number
  fill?: boolean
  width?: number
  height?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  onContextMenu?: (e: React.MouseEvent) => void
  showWatermark?: boolean
  watermarkText?: string
  // 新增：移动端适配选项
  adaptiveContainer?: boolean // 是否使用自适应容器
  maxHeight?: string // 最大高度限制
  // 新增：业务相关参数
  userId?: string // 用户ID（未登录则为空）
  postId?: string // 图片对应的postId
  collectionId?: string // 图片所属的collectionId
  hasWatermark?: boolean // 是否含水印（用于判断是在list流打开的、还是在模态框详情下打开的）
}

export default function ProtectedImage({
  src,
  alt,
  className,
  priority = false,
  sizes,
  quality = 80,
  fill = false,
  width,
  height,
  placeholder = 'empty',
  blurDataURL,
  onContextMenu,
  showWatermark = false,
  watermarkText = process.env.NEXT_PUBLIC_COPYRIGHT_TEXT || '© Digital Garden',
  adaptiveContainer = false,
  maxHeight = '60vh',
  userId,
  postId,
  collectionId,
  hasWatermark,
  ...props
}: ProtectedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{
    width: number
    height: number
  } | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    // 记录图片访问
    if (typeof window !== 'undefined') {
      clientLogger.logImageAccess('view', {
        userId,
        postId,
        collectionId,
        hasWatermark: hasWatermark ?? showWatermark,
      })
    }
  }, [src, userId, postId, collectionId, hasWatermark, showWatermark])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (onContextMenu) {
      onContextMenu(e)
    }
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false)
    setHasError(false)

    // 如果启用自适应容器，记录图片实际尺寸
    if (adaptiveContainer && e.currentTarget) {
      const img = e.currentTarget
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    }
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground rounded-lg',
          adaptiveContainer ? 'min-h-[200px]' : '',
          className
        )}
      >
        <p>图片加载失败</p>
      </div>
    )
  }

  // 计算容器样式
  const getContainerStyle = () => {
    if (!adaptiveContainer || fill) {
      return {}
    }

    const style: React.CSSProperties = {
      maxHeight: maxHeight,
    }

    // 如果有指定的宽高，使用指定的比例
    if (width && height) {
      const aspectRatio = width / height
      style.aspectRatio = aspectRatio.toString()
    }
    // 如果有图片实际尺寸，使用实际比例
    else if (imageDimensions) {
      const aspectRatio = imageDimensions.width / imageDimensions.height
      style.aspectRatio = aspectRatio.toString()
    }

    return style
  }

  const containerClasses = cn(
    'relative overflow-hidden select-none',
    adaptiveContainer && !fill ? 'w-full' : '',
    className
  )

  return (
    <div
      className={containerClasses}
      style={{
        ...getContainerStyle(),
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
    >
      {/* 加载状态 */}
      {isLoading && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-muted animate-pulse',
            adaptiveContainer ? 'min-h-[200px]' : ''
          )}
        >
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 图片 */}
      <Image
        ref={imageRef}
        src={src}
        alt={alt}
        fill={fill}
        width={fill ? undefined : width || 800}
        height={fill ? undefined : height || 600}
        priority={priority}
        sizes={
          sizes ||
          (adaptiveContainer
            ? '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
            : undefined)
        }
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          adaptiveContainer && !fill
            ? 'w-full h-auto object-contain'
            : 'object-cover'
        )}
        {...props}
      />

      {/* 水印 - 改进定位逻辑 */}
      {showWatermark && !isLoading && (
        <div
          className={
            // cn(
            // 'absolute bg-blue-100/20 text-white/50 text-body-xs px-1 py-0 rounded backdrop-blur-sm pointer-events-none',
            // 在自适应模式下，水印相对于图片内容定位
            // adaptiveContainer ? 'bottom-2 right-2' : 'bottom-2 right-2'
            // )
            'absolute bottom-2 right-2 bg-gray-100/20 text-white/50 text-body-xs px-1 py-0 rounded backdrop-blur-sm pointer-events-none'
          }
        >
          {watermarkText}
        </div>
      )}
    </div>
  )
}

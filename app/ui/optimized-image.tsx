// app/ui/optimized-image.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  sizes?: string
  quality?: number
  fill?: boolean
  style?: React.CSSProperties
  onLoad?: () => void
  onError?: () => void
  // 懒加载相关
  lazy?: boolean
  threshold?: number
  rootMargin?: string
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 85,
  fill = false,
  style,
  onLoad,
  onError,
  lazy = true,
  threshold = 0.1,
  rootMargin = '50px',
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(!lazy || priority)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  // 懒加载逻辑
  useEffect(() => {
    if (!lazy || priority || isInView) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        threshold,
        rootMargin,
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [lazy, priority, isInView, threshold, rootMargin])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  // 生成低质量占位符
  const generateBlurDataURL = (w: number = 10, h: number = 10) => {
    return `data:image/svg+xml;base64,${Buffer.from(
      `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <rect width="100%" height="100%" fill="url(#gradient)" opacity="0.3"/>
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#e5e7eb;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#d1d5db;stop-opacity:1" />
          </linearGradient>
        </defs>
      </svg>`
    ).toString('base64')}`
  }

  // 错误状态占位符
  if (hasError) {
    return (
      <div
        ref={imgRef}
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground',
          className
        )}
        style={style}
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    )
  }

  // 懒加载占位符
  if (!isInView) {
    return (
      <div
        ref={imgRef}
        className={cn(
          'animate-pulse bg-gradient-to-br from-muted to-muted/50',
          className
        )}
        style={style}
      />
    )
  }

  return (
    <div ref={imgRef} className={cn('relative overflow-hidden', className)} style={style}>
      {/* 加载状态指示器 */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL || generateBlurDataURL(width, height)}
        sizes={sizes}
        quality={quality}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          fill ? 'object-cover' : ''
        )}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  )
}

// 预设配置的图片组件
export function PhotoGridImage(props: Omit<OptimizedImageProps, 'sizes' | 'quality'>) {
  return (
    <OptimizedImage
      {...props}
      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
      quality={80}
      placeholder="blur"
    />
  )
}

export function HeroImage(props: Omit<OptimizedImageProps, 'sizes' | 'quality' | 'priority'>) {
  return (
    <OptimizedImage
      {...props}
      sizes="100vw"
      quality={90}
      priority={true}
      placeholder="blur"
    />
  )
}

export function ThumbnailImage(props: Omit<OptimizedImageProps, 'sizes' | 'quality'>) {
  return (
    <OptimizedImage
      {...props}
      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 200px"
      quality={75}
      placeholder="blur"
    />
  )
}
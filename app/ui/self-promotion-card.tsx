'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Camera, ExternalLink } from 'lucide-react'
import { useI18n } from '@/app/context/i18n-provider'

interface SelfPromotionCardProps {
  imageUrl?: string
  lang: string
  className?: string
}

export function SelfPromotionCard({
  imageUrl,
  lang,
  className,
}: SelfPromotionCardProps) {
  const dictionary = useI18n()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{
    width: number
    height: number
  } | null>(null)

  // 如果没有图片，不显示组件
  if (!imageUrl || imageError) {
    return null
  }

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.target as HTMLImageElement
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    })
    setImageLoaded(true)
  }

  const handleImageError = () => {
    setImageError(true)
  }

  // 计算容器的宽高比和样式
  const isPortrait =
    imageDimensions && imageDimensions.height > imageDimensions.width
  const aspectRatio = imageDimensions
    ? imageDimensions.width / imageDimensions.height
    : 16 / 9 // 默认横屏比例

  return (
    <div className={cn('mt-4 space-y-4', className)}>
      {/* 引导文案 */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-start space-x-2 text-muted-foreground">
          <Camera className="h-4 w-4" />
          <span className="text-body-sm font-medium">
            {dictionary.selfPromotion.discoverMore}
          </span>
        </div>
      </div>

      {/* 图片卡片 */}
      <Link
        href={`/${lang}`}
        className="block group relative overflow-hidden rounded-lg border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
      >
        <div
          className={cn(
            'relative bg-muted',
            isPortrait ? 'aspect-[3/4]' : 'aspect-video'
          )}
          style={{
            aspectRatio: imageDimensions ? aspectRatio : undefined,
          }}
        >
          <Image
            src={imageUrl}
            alt={dictionary.selfPromotion.featuredWork}
            fill
            className={cn(
              'object-cover transition-all duration-300 group-hover:scale-105',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
            sizes="(max-width: 1024px) 0px, 256px"
          />

          {/* 加载状态 */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse bg-muted-foreground/20 rounded w-8 h-8" />
            </div>
          )}

          {/* 悬浮效果 */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />

          {/* 链接图标 */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-background/90 backdrop-blur-sm rounded-full p-2">
              <ExternalLink className="h-3 w-3 text-foreground" />
            </div>
          </div>
        </div>

        {/* 底部文案 */}
        <div className="p-3 bg-background/95 backdrop-blur-sm">
          <p className="text-body-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {dictionary.selfPromotion.goToHome}
          </p>
          <p className="text-label-sm text-muted-foreground">
            {dictionary.selfPromotion.tryProjectDemo}
          </p>
        </div>
      </Link>
    </div>
  )
}

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { FeaturedGroup } from '@/types/sanity'
import { Locale } from '@/i18n-config'

interface HeroSectionProps {
  collections: FeaturedGroup[]
  lang: Locale
}

export function HeroSection({ collections, lang }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const router = useRouter()

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 清理所有定时器
  const clearAllTimers = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current)
      pauseTimeoutRef.current = null
    }
  }

  // 启动自动播放
  const startAutoPlay = () => {
    clearAllTimers()
    if (collections.length <= 1) return

    intervalRef.current = setInterval(() => {
      if (!isTransitioning) {
        goToPrev()
      }
    }, 6000)
  }

  // 停止自动播放
  const stopAutoPlay = () => {
    setIsAutoPlaying(false)
    clearAllTimers()
  }

  // 向右切换（从左到右：显示下一张图片）
  const goToNext = () => {
    if (isTransitioning) return

    setIsTransitioning(true)
    const nextIndex = (currentIndex + 1) % collections.length
    setCurrentIndex(nextIndex)

    setTimeout(() => {
      setIsTransitioning(false)
    }, 600)
  }

  // 向左切换（从右到左：显示上一张图片）
  const goToPrev = () => {
    if (isTransitioning) return

    setIsTransitioning(true)
    const prevIndex =
      currentIndex === 0 ? collections.length - 1 : currentIndex - 1
    setCurrentIndex(prevIndex)

    setTimeout(() => {
      setIsTransitioning(false)
    }, 600)
  }

  // 手动切换到指定索引
  const goToSlide = (targetIndex: number) => {
    if (targetIndex === currentIndex || isTransitioning) return

    // 暂停自动播放
    stopAutoPlay()
    setIsTransitioning(true)
    setCurrentIndex(targetIndex)

    setTimeout(() => {
      setIsTransitioning(false)
      // 3秒后恢复自动播放
      pauseTimeoutRef.current = setTimeout(() => {
        setIsAutoPlaying(true)
      }, 3000)
    }, 600)
  }

  // 自动播放逻辑
  useEffect(() => {
    if (isAutoPlaying && !isTransitioning) {
      startAutoPlay()
    } else {
      clearAllTimers()
    }

    return clearAllTimers
  }, [isAutoPlaying, isTransitioning, currentIndex])

  // 组件卸载时清理
  useEffect(() => {
    return clearAllTimers
  }, [])

  // 跳转到collection页面
  const goToCollection = (collection: FeaturedGroup) => {
    router.push(`/${lang}/gallery/${collection.slug}`)
  }

  // 根据语言动态选择Collection名称
  const getCollectionName = (collection: FeaturedGroup) => {
    return lang === 'en'
      ? collection.name?.en || collection.name?.zh || 'Untitled'
      : collection.name?.zh || collection.name?.en || '无标题'
  }

  // 获取相邻图片的索引
  const getPrevIndex = () =>
    currentIndex === 0 ? collections.length - 1 : currentIndex - 1
  const getNextIndex = () =>
    currentIndex === collections.length - 1 ? 0 : currentIndex + 1

  if (collections.length === 0) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-muted/20">
        <p className="text-muted-foreground">
          No featured collections available
        </p>
      </div>
    )
  }

  const currentCollection = collections[currentIndex]
  const prevCollection = collections[getPrevIndex()]
  const nextCollection = collections[getNextIndex()]

  return (
    <>
      {/* 桌面端：三图布局 */}
      <div className="hidden md:flex w-full h-[calc(100vh-3.5rem-6rem)] items-center justify-center bg-gradient-to-b from-background via-background/95 to-background/90 relative overflow-hidden hero-container">
        {/* 背景渐变层 */}
        <div className="absolute inset-0 bg-gradient-radial from-background/20 via-background/60 to-background/90" />

        {/* 三图容器 */}
        <div className="relative flex items-center justify-center w-full px-4 mt-8">
          {/* 左侧小图 */}
          {collections.length > 1 && (
            <div
              className={`relative mt-24 w-[calc((100vh-9.5rem)*0.65*1*1.5)] h-[calc((100vh-9.5rem)*0.65*1)] cursor-pointer group hero-image hero-side-image ${
                isTransitioning ? 'transitioning' : ''
              } hover:scale-105`}
              onClick={goToNext}
            >
              {/* 悬停箭头指示器 */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <div className="bg-black/50 rounded-full p-2 transform transition-transform group-hover:scale-110">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* 图片容器 */}
              <div className="relative w-full h-full rounded-lg overflow-hidden">
                {prevCollection.coverImageUrl && (
                  <Image
                    src={prevCollection.coverImageUrl}
                    alt={getCollectionName(prevCollection)}
                    fill
                    className="object-cover filter opacity-85 dark:opacity-90 brightness-75 dark:brightness-90 transition-all duration-500 group-hover:blur-none group-hover:brightness-100"
                    sizes="(max-width: 768px) 0px, 25vw"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent" />
              </div>
            </div>
          )}

          {/* 中间主图 */}
          <div className="relative flex flex-col items-center mx-8">
            <div
              className={`relative w-[calc((100vh-9.5rem)*0.95*1.5)] h-[calc((100vh-9.5rem)*0.95)] cursor-pointer group hero-image hero-main-image ${
                isTransitioning ? 'transitioning' : ''
              }`}
              onClick={() => goToCollection(currentCollection)}
            >
              <div className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl">
                {currentCollection.coverImageUrl && (
                  <Image
                    src={currentCollection.coverImageUrl}
                    alt={getCollectionName(currentCollection)}
                    fill
                    className="object-cover transition-transform duration-500"
                    sizes="(max-width: 768px) 0px, 50vw"
                    priority
                  />
                )}

                {/* 顶部光线投射阴影效果 */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20" />

                {/* 悬停时显示的Collection名称 */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                  <div className="bg-white/40 backdrop-blur-sm px-9 py-3 rounded-lg shadow-lg transform transition-transform group-hover:scale-105">
                    <h1 className="text-heading-xl lg:text-heading-2xl font-display font-medium text-gray-900 tracking-wide whitespace-nowrap">
                      {getCollectionName(currentCollection)}
                    </h1>
                  </div>
                </div>
              </div>

              {/* 底部阴影 */}
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-full h-8 bg-black/20 blur-xl rounded-full scale-75" />
            </div>
          </div>

          {/* 右侧小图 */}
          {collections.length > 1 && (
            <div
              className={`relative mt-24 w-[calc((100vh-9.5rem)*0.65*1*1.5)] h-[calc((100vh-9.5rem)*0.65*1)] cursor-pointer group hero-image hero-side-image ${
                isTransitioning ? 'transitioning' : ''
              } hover:scale-105`}
              onClick={goToPrev}
            >
              {/* 悬停箭头指示器 */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <div className="bg-black/50 rounded-full p-2 transform transition-transform group-hover:scale-110">
                  <ChevronRight className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* 图片容器 */}
              <div className="relative w-full h-full rounded-lg overflow-hidden">
                {nextCollection.coverImageUrl && (
                  <Image
                    src={nextCollection.coverImageUrl}
                    alt={getCollectionName(nextCollection)}
                    fill
                    className="object-cover filter opacity-85 dark:opacity-90 brightness-75 dark:brightness-90 transition-all duration-500 group-hover:blur-none group-hover:brightness-100"
                    sizes="(max-width: 768px) 0px, 25vw"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-l from-black/50 via-black/25 to-transparent" />
              </div>
            </div>
          )}
        </div>

        {/* 轮播指示器 */}
        {collections.length > 1 && (
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {collections.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                disabled={isTransitioning}
                className={`carousel-indicator w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-foreground/70 scale-110 active'
                    : 'bg-foreground/20 hover:bg-foreground/40'
                } ${isTransitioning ? 'cursor-not-allowed opacity-50' : ''}`}
                aria-label={`切换到第 ${index + 1} 个集合`}
              />
            ))}
          </div>
        )}

        {/* 状态指示器 */}
        {collections.length > 1 && (
          <div className="absolute top-6 right-6">
            <div
              className={`status-indicator w-2 h-2 rounded-full transition-colors duration-300 ${
                isTransitioning
                  ? 'bg-blue-500/60'
                  : isAutoPlaying
                  ? 'bg-green-500/60 auto-playing'
                  : 'bg-yellow-500/60'
              }`}
              title={
                isTransitioning
                  ? '切换中...'
                  : isAutoPlaying
                  ? '自动播放中（从左到右）'
                  : '已暂停'
              }
            />
          </div>
        )}

        {/* 自动播放进度条 */}
        {isAutoPlaying && !isTransitioning && collections.length > 1 && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-32 h-0.5 bg-white/20 rounded-full overflow-hidden">
            <div
              key={`progress-${currentIndex}`}
              className="h-full bg-white/60 rounded-full progress-animation"
            />
          </div>
        )}
      </div>

      {/* 移动端保持原有设计 */}
      <div className="md:hidden w-full min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 space-y-8">
          {collections.map((collection, index) => (
            <div
              key={collection._id}
              className="relative group cursor-pointer"
              onClick={() => goToCollection(collection)}
            >
              <h2 className="text-heading-xl font-display font-medium text-center mb-4 text-foreground tracking-wide">
                {getCollectionName(collection)}
              </h2>
              <div className="relative w-full aspect-[3/2] rounded-lg overflow-hidden shadow-lg group-active:scale-95 transition-transform duration-200">
                {collection.coverImageUrl && (
                  <Image
                    src={collection.coverImageUrl}
                    alt={getCollectionName(collection)}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={index < 2}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

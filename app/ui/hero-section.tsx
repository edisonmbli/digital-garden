'use client'

import { useEffect, useState } from 'react'
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
  const router = useRouter()

  // 自动轮播逻辑 - 每5秒切换
  useEffect(() => {
    if (!isAutoPlaying || collections.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === collections.length - 1 ? 0 : prevIndex + 1
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlaying, collections.length])

  // 手动切换到指定索引
  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
    // 3秒后恢复自动播放
    setTimeout(() => setIsAutoPlaying(true), 3000)
  }

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
      <div className="hidden md:flex w-full h-[calc(100vh-3.5rem-6rem)] items-center justify-center bg-gradient-to-b from-background via-background/95 to-background/90 relative overflow-hidden">
        {/* 背景渐变层 */}
        <div className="absolute inset-0 bg-gradient-radial from-background/20 via-background/60 to-background/90" />

        {/* 三图容器 - 解除宽度限制，让左右小图充分利用屏幕空间 */}
        <div className="relative flex items-center justify-center w-full px-4 mt-8">
          {/* 左侧小图 - 扩展到屏幕左边缘 */}
          {collections.length > 1 && (
            <div
              className="relative mt-24 w-[calc((100vh-9.5rem)*0.65*1*1.5)] h-[calc((100vh-9.5rem)*0.65*1)] cursor-pointer group transition-all duration-500 hover:scale-105"
              onClick={() => goToSlide(getPrevIndex())}
            >
              {/* 悬停箭头指示器 */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <div className="bg-black/50 rounded-full p-2">
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
                {/* 调亮的亮度渐变遮罩 */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent" />
              </div>
            </div>
          )}

          {/* 中间主图 - 保持原有尺寸 */}
          <div className="relative flex flex-col items-center mx-8">
            {/* 主图容器 - 保持用户调整后的尺寸 */}
            <div
              className="relative w-[calc((100vh-9.5rem)*0.95*1.5)] h-[calc((100vh-9.5rem)*0.95)] cursor-pointer group transition-all duration-500"
              onClick={() => goToCollection(currentCollection)}
            >
              <div className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl">
                {currentCollection.coverImageUrl && (
                  <Image
                    src={currentCollection.coverImageUrl}
                    alt={getCollectionName(currentCollection)}
                    fill
                    // group-hover:scale-110
                    className="object-cover transition-transform duration-500 "
                    sizes="(max-width: 768px) 0px, 50vw"
                    priority
                  />
                )}
                {/* 顶部光线投射阴影效果 */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20" />

                {/* 悬停时显示的Collection名称 - 半透明白底色块 */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                  <div className="bg-white/30 backdrop-blur-sm px-8 py-4 rounded-lg shadow-lg">
                    <h1 className="text-2xl lg:text-3xl font-medium text-gray-900 tracking-wide whitespace-nowrap">
                      {getCollectionName(currentCollection)}
                    </h1>
                  </div>
                </div>
              </div>

              {/* 底部阴影 */}
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-full h-8 bg-black/20 blur-xl rounded-full scale-75" />
            </div>
          </div>

          {/* 右侧小图 - 扩展到屏幕右边缘 */}
          {collections.length > 1 && (
            <div
              className="relative mt-24 w-[calc((100vh-9.5rem)*0.65*1*1.5)] h-[calc((100vh-9.5rem)*0.65*1)] cursor-pointer group transition-all duration-500 hover:scale-105"
              onClick={() => goToSlide(getNextIndex())}
            >
              {/* 悬停箭头指示器 */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <div className="bg-black/50 rounded-full p-2">
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
                {/* 调亮的亮度渐变遮罩 */}
                <div className="absolute inset-0 bg-gradient-to-l from-black/50 via-black/25 to-transparent" />
              </div>
            </div>
          )}
        </div>

        {/* 轮播指示器 - 减小尺寸，增加透明度，减少底部空白 */}
        {collections.length > 1 && (
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {collections.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-foreground/70 scale-110'
                    : 'bg-foreground/20 hover:bg-foreground/40'
                }`}
                aria-label={`切换到第 ${index + 1} 个集合`}
              />
            ))}
          </div>
        )}

        {/* 自动播放状态指示器 */}
        {collections.length > 1 && (
          <div className="absolute top-6 right-6">
            <div
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                isAutoPlaying ? 'bg-green-500/60' : 'bg-yellow-500/60'
              }`}
              title={isAutoPlaying ? '自动播放中' : '已暂停'}
            />
          </div>
        )}
      </div>

      {/* 移动端：楼层式布局 */}
      <div className="md:hidden w-full min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 space-y-8">
          {collections.map((collection, index) => (
            <div
              key={collection._id}
              className="relative group cursor-pointer"
              onClick={() => goToCollection(collection)}
            >
              {/* Collection 名称 */}
              <h2 className="text-2xl font-bold text-center mb-4 text-foreground">
                {getCollectionName(collection)}
              </h2>

              {/* 封面图 */}
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
                {/* 轻微的渐变遮罩 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

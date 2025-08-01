'use client'

import { Button } from '@/components/ui/button'
import { getDictionary } from '@/lib/dictionary'
import { FeaturedGroup } from '@/types/sanity'
import { Locale } from '@/i18n-config'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type DictionaryType = Awaited<ReturnType<typeof getDictionary>>

interface HomePageShellProps {
  dictionary: DictionaryType
  collections: FeaturedGroup[]
  lang: Locale
}

export function HomePageShell({ dictionary, collections, lang }: HomePageShellProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const router = useRouter()

  // 自动轮播逻辑 - 延长到6秒
  useEffect(() => {
    if (!isAutoPlaying || collections.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === collections.length - 1 ? 0 : prevIndex + 1
      )
    }, 6000) // 每6秒切换一次

    return () => clearInterval(interval)
  }, [isAutoPlaying, collections.length])

  // 手动切换到指定索引
  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
    // 3秒后恢复自动播放
    setTimeout(() => setIsAutoPlaying(true), 3000)
  }

  // 上一张
  const goToPrevious = () => {
    const newIndex =
      currentIndex === 0 ? collections.length - 1 : currentIndex - 1
    goToSlide(newIndex)
  }

  // 下一张
  const goToNext = () => {
    const newIndex =
      currentIndex === collections.length - 1 ? 0 : currentIndex + 1
    goToSlide(newIndex)
  }

  // 跳转到collection页面
  const goToCollection = () => {
    if (hasCollections && currentCollection) {
      router.push(`/${lang}/gallery/${currentCollection.slug}`)
    }
  }

  // 如果没有集合数据，显示默认背景
  const currentCollection = collections[currentIndex]
  const hasCollections = collections.length > 0

  // 根据语言动态选择Collection名称的辅助函数
  const getCollectionName = (collection: FeaturedGroup) => {
    return lang === 'en' 
      ? (collection.name?.en || collection.name?.zh || 'Untitled') 
      : (collection.name?.zh || collection.name?.en || '无标题')
  }

  return (
    <div className="w-full min-h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
        {/* 轮播图区域 - 恢复上边距，包含按钮和指示器 */}
        <div className="relative flex-1 mt-12 mb-8 rounded-lg overflow-hidden">
          {/* 背景图片轮播 */}
          {hasCollections ? (
            <div 
              className="absolute inset-0 cursor-pointer"
              onClick={goToCollection}
            >
              {collections.map((collection, index) => (
                <div
                  key={collection._id}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    index === currentIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {collection.coverImageUrl && (
                    <Image
                      src={collection.coverImageUrl}
                      alt={getCollectionName(collection)}
                      fill
                      sizes="100vw"
                      priority={index === 0}
                      className="object-cover dark:brightness-110"
                      quality={90}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            // 默认背景（当没有集合时）
            <div className="absolute inset-0 bg-muted/50" />
          )}

          {/* 深色遮罩层 - 减少深色模式下的遮罩透明度 */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 dark:from-neutral-900/15 dark:to-neutral-900/25" />

          {/* 轮播控制 */}
          {hasCollections && collections.length > 1 && (
            <>
              {/* 导航按钮 */}
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors duration-200 dark:bg-neutral-800/30 dark:hover:bg-neutral-800/50"
                aria-label="上一张图片"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors duration-200 dark:bg-neutral-800/30 dark:hover:bg-neutral-800/50"
                aria-label="下一张图片"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* 底部内容区域 - 在轮播图内部 */}
          <div className="absolute bottom-0 left-0 right-0 z-20 pb-8 flex flex-col items-center">
            {/* 当前集合信息和按钮 - 固定宽度 */}
            {hasCollections && currentCollection && (
              <div className="mb-4">
                <Button
                  size="lg"
                  className="bg-white/90 text-black hover:bg-white dark:bg-neutral-200 dark:hover:bg-white dark:text-neutral-900 flex items-center gap-2 min-w-[240px] justify-center"
                  onClick={goToCollection}
                >
                  {(() => {
                    const collectionName = getCollectionName(currentCollection)
                    return collectionName.length > 20
                      ? `${collectionName.substring(0, 17)}...`
                      : collectionName
                  })()}
                  <ArrowRight className="h-4 w-4 flex-shrink-0" />
                </Button>
              </div>
            )}

            {/* 指示器 - 位于按钮下方 */}
            {hasCollections && collections.length > 1 && (
              <div className="flex space-x-2">
                {collections.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      index === currentIndex
                        ? 'bg-white scale-110 dark:bg-neutral-200'
                        : 'bg-white/50 hover:bg-white/70 dark:bg-neutral-400 dark:hover:bg-neutral-300'
                    }`}
                    aria-label={`切换到第 ${index + 1} 张图片`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 暂停/播放指示器 */}
          {hasCollections && collections.length > 1 && (
            <div className="absolute top-4 right-4 z-20">
              <div
                className={`w-2 h-2 rounded-full ${
                  isAutoPlaying
                    ? 'bg-green-400 dark:bg-green-500'
                    : 'bg-yellow-400 dark:bg-yellow-500'
                }`}
              />
            </div>
          )}
        </div>

        {/* 描述文本 - 轮播图外部下方 */}
        <div className="text-center pb-8">
          <p className="mx-auto max-w-[700px] text-lg text-foreground/80">
            {dictionary.homepage.description}
          </p>
        </div>
      </div>
    </div>
  )
}

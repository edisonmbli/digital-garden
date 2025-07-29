// app/ui/photo-grid.tsx
'use client'

import { FadeIn } from '@/app/ui/fade-in'
import { useState, useCallback, useEffect } from 'react'
import clsx from 'clsx'
import Image from 'next/image'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
} from '@/app/ui/responsive-dialog'
import Masonry from 'react-masonry-css'
import { EnhancedLikeButton } from '@/app/ui/enhanced-like-button'
import AuthModal from '@/app/ui/auth-modal'
import { useI18n } from '@/app/context/i18n-provider'
import { type EnrichedPhoto } from '@/types/sanity'
import { MessageCircle } from 'lucide-react'

export function PhotoGrid({ photos }: { photos: EnrichedPhoto[] }) {
  const [selectedPhoto, setSelectedPhoto] = useState<EnrichedPhoto | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingPhoto, setPendingPhoto] = useState<EnrichedPhoto | null>(null)
  const dict = useI18n()

  // 检查URL参数中的照片ID，自动打开对应照片
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const photoId = urlParams.get('photo')
      
      if (photoId && photos.length > 0) {
        const targetPhoto = photos.find(photo => photo._id === photoId)
        if (targetPhoto) {
          setSelectedPhoto(targetPhoto)
          // 清理URL参数，避免刷新时重复打开
          const newUrl = new URL(window.location.href)
          newUrl.searchParams.delete('photo')
          window.history.replaceState({}, '', newUrl.toString())
        }
      }
    }
  }, [photos])

  const isLandscape =
    selectedPhoto &&
    selectedPhoto.metadata &&
    selectedPhoto.metadata.dimensions &&
    selectedPhoto.metadata.dimensions.width /
      selectedPhoto.metadata.dimensions.height >
      1

  // 定义断点
  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  }

  // 使用 useCallback 优化回调函数，避免不必要的重新渲染
  const handleAuthRequired = useCallback(() => {
    // 实现模态框替换模式：关闭照片模态框，保存当前照片，显示认证模态框
    setPendingPhoto(selectedPhoto)
    setSelectedPhoto(null)
    setShowAuthModal(true)
  }, [selectedPhoto, pendingPhoto])

  const handleAuthSuccess = useCallback(() => {
    if (pendingPhoto) {
      setSelectedPhoto(pendingPhoto)
      setPendingPhoto(null)
    }
    setShowAuthModal(false)
  }, [pendingPhoto])

  const handleAuthModalClose = useCallback(() => {
    setShowAuthModal(false)
    setPendingPhoto(null)
  }, [])

  return (
    <>
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="my-masonry-grid"
        columnClassName="my-masonry-grid_column"
      >
        {photos.map((photo) => (
          <FadeIn key={photo._id}>
            <div
              className="rounded-lg overflow-hidden cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            >
              <Image
                src={photo.imageUrl}
                alt={photo.title || 'A photo from the collection'}
                width={photo.metadata?.dimensions.width}
                height={photo.metadata?.dimensions.height}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                placeholder="blur"
                blurDataURL={photo.metadata?.lqip}
              />
            </div>
          </FadeIn>
        ))}
      </Masonry>

      {/* 照片详情模态框 */}
      <ResponsiveDialog
        open={!!selectedPhoto}
        onOpenChange={() => setSelectedPhoto(null)}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ResponsiveDialogContent className="p-0 md:max-w-7xl md:max-h-[95vh] bg-background border-0 md:border md:rounded-lg overflow-hidden">
          {selectedPhoto && (
            <>
              {/* 桌面端：左右分栏布局 */}
              <div className="hidden md:flex md:h-[90vh]">
                {/* 左侧：照片展示区域 */}
                <div className="flex-1 relative bg-neutral-50 dark:bg-neutral-900 flex p-6 overflow-hidden">
                  <div className="m-auto">
                    {/* 动态相框容器 - 贴合照片尺寸 */}
                    <div className="relative inline-block bg-white dark:bg-white p-3 shadow-2xl">
                      {/* 照片本体 */}
                      <div className="relative">
                        <Image
                          src={selectedPhoto.imageUrl}
                          alt={
                            selectedPhoto.title || 'A photo from the collection'
                          }
                          width={
                            selectedPhoto.metadata?.dimensions.width || 800
                          }
                          height={
                            selectedPhoto.metadata?.dimensions.height || 600
                          }
                          className="max-w-full max-h-[calc(90vh-6rem)] object-contain"
                          sizes="(min-width: 768px) 60vw, 90vw"
                          priority
                        />
                        {/* 照片表面的微妙光泽效果 */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/3 to-transparent pointer-events-none"></div>
                      </div>
                    </div>
                  </div>
                  {/* 相框投影 - 动态适应 */}
                  <div className="absolute inset-8 -z-10 bg-black/20 dark:bg-black/40 blur-xl transform-gpu"></div>
                </div>

                {/* 右侧：信息和互动区域 */}
                <div className="w-80 flex flex-col bg-background border-l border-border/20">
                  {/* 内容区域 - 增加垂直内边距以实现视觉平衡 */}
                  <div
                    className={clsx(
                      'p-6 overflow-y-auto flex flex-1 flex-col',
                      isLandscape ? 'justify-center' : 'pt-[30%]'
                    )}
                  >
                    {selectedPhoto.title && (
                      <h3 className="font-bold text-2xl mb-4 text-foreground tracking-tight leading-tight">
                        {selectedPhoto.title}
                      </h3>
                    )}
                    {selectedPhoto.description && (
                      <p className="text-base text-muted-foreground leading-relaxed">
                        {selectedPhoto.description}
                      </p>
                    )}
                  </div>

                  {/* 底部固定的互动区域 */}
                  {selectedPhoto.post && (
                    <div className="p-6 border-t border-border/10 bg-background/80 backdrop-blur-sm">
                      <div className="space-y-3">
                        {/* 点赞按钮 */}
                        <EnhancedLikeButton
                          postId={selectedPhoto.post.id}
                          initialLikes={selectedPhoto.post.likesCount}
                          isLikedByUser={selectedPhoto.post.isLikedByUser}
                          onAuthRequired={handleAuthRequired}
                          variant="default"
                          className="w-full justify-center"
                        />

                        {/* 评论统计 */}
                        <div className="flex items-center justify-center text-muted-foreground text-sm">
                          <MessageCircle className="mr-2 h-5 w-5" />
                          <span>
                            {selectedPhoto.post.commentsCount} {dict.interactions.comments}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 移动端：优化的垂直布局 */}
              <div
                className={clsx('md:hidden flex flex-col', {
                  'min-h-[50vh]': isLandscape,
                })}
              >
                {/* 照片展示区域 - 动态高度 */}
                <div className="relative bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-3 overflow-hidden">
                  {/* 动态相框容器 - 贴合照片尺寸 */}
                  <div className="relative inline-block bg-white dark:bg-white p-2 shadow-2xl">
                    {/* 照片本体 */}
                    <div className="relative">
                      <Image
                        src={selectedPhoto.imageUrl}
                        alt={
                          selectedPhoto.title || 'A photo from the collection'
                        }
                        width={selectedPhoto.metadata?.dimensions.width || 800}
                        height={
                          selectedPhoto.metadata?.dimensions.height || 600
                        }
                        className="max-w-full max-h-[calc(95vh-12rem)] object-contain"
                        sizes="(min-width: 768px) 60vw, 90vw"
                        priority
                      />
                      {/* 照片表面的微妙光泽效果 */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/3 to-transparent pointer-events-none"></div>
                    </div>
                  </div>
                  {/* 相框投影 - 动态适应 */}
                  <div className="absolute inset-4 -z-10 bg-black/20 dark:bg-black/40 blur-xl transform-gpu"></div>
                </div>

                {/* 信息区域 - 紧凑布局 */}
                <div className="bg-background border-t border-border/20 p-4 space-y-3">
                  {selectedPhoto.title && (
                    <h3 className="font-bold text-lg text-foreground tracking-tight leading-tight">
                      {selectedPhoto.title}
                    </h3>
                  )}
                  {selectedPhoto.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedPhoto.description}
                    </p>
                  )}
                </div>

                {/* 底部固定的互动栏 - 现代移动端设计 */}
                {selectedPhoto.post && (
                  <div className="bg-background border-t border-border/20 p-4 pb-6 safe-area-pb">
                    <div className="flex items-center justify-center space-x-10">
                      {/* 点赞按钮 */}
                      <EnhancedLikeButton
                        postId={selectedPhoto.post.id}
                        initialLikes={selectedPhoto.post.likesCount}
                        isLikedByUser={selectedPhoto.post.isLikedByUser}
                        onAuthRequired={handleAuthRequired}
                        variant="compact"
                      />

                      {/* 评论按钮 */}
                      <div className="flex items-center text-muted-foreground text-sm">
                        <MessageCircle className="mr-2 h-6 w-6" />
                        <span>{selectedPhoto.post.commentsCount}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* 认证模态框 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        onAuthSuccess={handleAuthSuccess}
        action="like"
        redirectUrl={
          typeof window !== 'undefined' 
            ? `${window.location.pathname}${window.location.search}${
                pendingPhoto 
                  ? (window.location.search ? '&' : '?') + `photo=${pendingPhoto._id}`
                  : ''
              }`
            : undefined
        }
      />
    </>
  )
}

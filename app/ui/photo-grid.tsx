// app/ui/photo-grid.tsx
'use client'

import { FadeIn } from '@/app/ui/fade-in'
import { useState, useCallback, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import Image from 'next/image'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
} from '@/app/ui/responsive-dialog'
import Masonry from 'react-masonry-css'
import { EnhancedLikeButton } from '@/app/ui/enhanced-like-button'
import EnhancedCommentButton from '@/app/ui/enhanced-comment-button'
import AuthModal from '@/app/ui/auth-modal'
import { useI18n } from '@/app/context/i18n-provider'
import { type EnrichedPhoto } from '@/types/sanity'
import CommentForm from '@/app/ui/comment-form'
import { CommentList } from '@/app/ui/comment-list'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  useOptimalModalSize,
  getModalStyles,
} from '@/hooks/use-optimal-modal-size'

export function PhotoGrid({ photos }: { photos: EnrichedPhoto[] }) {
  const [selectedPhoto, setSelectedPhoto] = useState<EnrichedPhoto | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingPhoto, setPendingPhoto] = useState<EnrichedPhoto | null>(null)
  const [showCommentForm, setShowCommentForm] = useState(false) // 新增：控制评论表单显示
  const [showCommentSubmittedMessage, setShowCommentSubmittedMessage] =
    useState(false)
  const [isCommentAuth, setIsCommentAuth] = useState(false) // 新增：标识是否是从评论触发的认证
  const [, startTransition] = useTransition()

  // 用于自动滚动到评论表单的 ref
  const desktopCommentFormRef = useRef<HTMLDivElement>(null)
  const mobileCommentFormRef = useRef<HTMLDivElement>(null)
  const desktopScrollContainerRef = useRef<HTMLDivElement>(null)
  const mobileScrollContainerRef = useRef<HTMLDivElement>(null)

  const dict = useI18n()
  const router = useRouter()

  // 动态计算模态框最优尺寸
  const optimalModalSize = useOptimalModalSize(
    selectedPhoto?.metadata?.dimensions
      ? {
          width: selectedPhoto.metadata.dimensions.width,
          height: selectedPhoto.metadata.dimensions.height,
        }
      : undefined
  )
  const modalStyles = getModalStyles(optimalModalSize)

  // 检查URL参数中的照片ID，自动打开对应照片
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const photoId = urlParams.get('photo')
      const shouldShowComment = urlParams.get('comment') === 'true'

      if (photoId && photos.length > 0) {
        const targetPhoto = photos.find((photo) => photo._id === photoId)
        if (targetPhoto) {
          setSelectedPhoto(targetPhoto)
          // 只有当 URL 中明确包含 comment=true 参数时，才拉起评论表单
          if (shouldShowComment) {
            setShowCommentForm(true)
          }
          // 清理URL参数，避免刷新时重复打开
          const newUrl = new URL(window.location.href)
          newUrl.searchParams.delete('photo')
          newUrl.searchParams.delete('comment')
          window.history.replaceState({}, '', newUrl.toString())
        }
      }
    }
  }, [photos])

  // 检测照片是否为横向
  const isLandscape = selectedPhoto
    ? (selectedPhoto.metadata?.dimensions.width || 0) >
      (selectedPhoto.metadata?.dimensions.height || 0)
    : false

  // 键盘导航功能
  const navigateToPhoto = useCallback(
    (direction: 'prev' | 'next') => {
      if (!selectedPhoto || photos.length <= 1) return

      const currentIndex = photos.findIndex(
        (photo) => photo._id === selectedPhoto._id
      )
      if (currentIndex === -1) return

      let newIndex: number
      if (direction === 'prev') {
        newIndex = currentIndex === 0 ? photos.length - 1 : currentIndex - 1
      } else {
        newIndex = currentIndex === photos.length - 1 ? 0 : currentIndex + 1
      }

      setSelectedPhoto(photos[newIndex])
      setShowCommentForm(false) // 重置评论表单状态
    },
    [selectedPhoto, photos]
  )

  // 键盘事件监听
  useEffect(() => {
    if (!selectedPhoto) return

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault()
          navigateToPhoto('prev')
          break
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault()
          navigateToPhoto('next')
          break
        case 'Escape':
          event.preventDefault()
          setSelectedPhoto(null)
          setShowCommentForm(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedPhoto, navigateToPhoto])

  // 评论表单展开时自动滚动
  useEffect(() => {
    if (!showCommentForm) return

    // 延迟执行，确保 DOM 更新完成
    const timer = setTimeout(() => {
      const isMobile = window.innerWidth < 768 // md 断点
      const scrollContainer = isMobile
        ? mobileScrollContainerRef.current
        : desktopScrollContainerRef.current
      const commentForm = isMobile
        ? mobileCommentFormRef.current
        : desktopCommentFormRef.current

      if (!scrollContainer || !commentForm) return

      // 获取评论表单的位置信息
      const formRect = commentForm.getBoundingClientRect()
      const containerRect = scrollContainer.getBoundingClientRect()

      // 计算需要滚动的距离
      // 目标：让评论表单底部高出容器底部一点（大约一条评论的高度，约 80px）
      const targetOffset = 80
      const scrollTop = scrollContainer.scrollTop
      const formBottomRelativeToContainer = formRect.bottom - containerRect.top
      const containerHeight = containerRect.height

      // 如果评论表单底部不在理想位置，则滚动
      const idealPosition = containerHeight - targetOffset
      if (formBottomRelativeToContainer > idealPosition) {
        const scrollDistance = formBottomRelativeToContainer - idealPosition
        scrollContainer.scrollTo({
          top: scrollTop + scrollDistance,
          behavior: 'smooth',
        })
      }
    }, 100) // 100ms 延迟确保 DOM 渲染完成

    return () => clearTimeout(timer)
  }, [showCommentForm])

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
    setIsCommentAuth(false) // 标记为非评论触发的认证
    setShowAuthModal(true)
  }, [selectedPhoto])

  // 专门处理评论按钮触发的认证请求
  const handleCommentAuthRequired = useCallback(() => {
    // 实现模态框替换模式：关闭照片模态框，保存当前照片，显示认证模态框
    setPendingPhoto(selectedPhoto)
    setSelectedPhoto(null)
    setIsCommentAuth(true) // 标记为评论触发的认证
    setShowAuthModal(true)
  }, [selectedPhoto])

  const handleAuthSuccess = useCallback(() => {
    setShowAuthModal(false)

    // 使用 startTransition 来处理状态更新，确保数据刷新完成后再重新打开模态框
    startTransition(() => {
      // 重要：登录成功后先刷新页面数据，确保 isLikedByUser 状态正确
      // 因为 isLikedByUser 是在服务器端基于 userId 计算的，登录后需要重新获取
      router.refresh()

      // 在 transition 完成后重新打开模态框
      setTimeout(() => {
        if (pendingPhoto) {
          setSelectedPhoto(pendingPhoto)
          setPendingPhoto(null)

          // 如果是评论触发的认证，登录成功后自动拉起评论表单
          if (isCommentAuth) {
            setShowCommentForm(true)
          }
        }

        setIsCommentAuth(false) // 重置状态
      }, 150) // 给数据刷新更多时间
    })
  }, [pendingPhoto, isCommentAuth, router, startTransition])

  const handleAuthModalClose = useCallback(() => {
    setShowAuthModal(false)
    setPendingPhoto(null)
    setIsCommentAuth(false) // 重置状态
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
              onClick={() => {
                console.log('🔍 Debug: Selected photo data:', {
                  photoId: photo._id,
                  post: photo.post,
                  hasPost: !!photo.post,
                  postFields: photo.post
                    ? Object.keys(photo.post)
                    : 'No post data',
                })
                setSelectedPhoto(photo)
                setShowCommentForm(false) // 重置评论表单状态
              }}
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
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPhoto(null)
            setShowCommentForm(false) // 重置评论表单状态
            // 清理 URL 参数，避免刷新时重复打开
            if (typeof window !== 'undefined') {
              const newUrl = new URL(window.location.href)
              newUrl.searchParams.delete('photo')
              newUrl.searchParams.delete('comment')
              window.history.replaceState({}, '', newUrl.toString())
            }
          }
        }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ResponsiveDialogContent
          className="p-0 bg-background border-0 md:border md:rounded-lg overflow-hidden"
          style={modalStyles.modal}
        >
          {selectedPhoto && (
            <>
              {/* 桌面端：上中下三层结构 - 整体可滚动 */}
              <div className="hidden md:flex md:flex-col md:h-full md:overflow-hidden">
                {/* 整体滚动容器 - 包含上中下三层 */}
                <div
                  ref={desktopScrollContainerRef}
                  className="flex-1 overflow-y-auto"
                >
                  {/* 上层：图片区域 - 使用动态计算的高度 */}
                  {/* 拍立得效果的白色边框容器 pt-3 bg-whiter/90 */}
                  <div
                    className="flex-shrink-0 pt-3 bg-white/90 dark:pt-0 dark:bg-background flex items-center justify-center"
                    style={modalStyles.photo}
                  >
                    <Image
                      src={selectedPhoto.imageUrl}
                      alt={selectedPhoto.title || 'A photo from the collection'}
                      width={selectedPhoto.metadata?.dimensions.width || 800}
                      height={selectedPhoto.metadata?.dimensions.height || 600}
                      className="max-w-full max-h-full object-contain"
                      sizes="90vw"
                      priority
                    />
                  </div>

                  {/* 中层：信息和互动按钮区域 */}
                  <div className="flex-shrink-0 bg-background border-t border-border/20 px-6 py-4">
                    <div className="flex items-end justify-between gap-6">
                      {/* 左侧：标题和描述 */}
                      <div className="flex-1 min-w-0">
                        {selectedPhoto.title && (
                          <h3 className="font-bold text-xl mb-2 text-foreground tracking-tight leading-tight">
                            {selectedPhoto.title}
                          </h3>
                        )}
                        {selectedPhoto.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {selectedPhoto.description}
                          </p>
                        )}
                      </div>

                      {/* 右侧：互动按钮 - 与描述底部对齐 */}
                      {selectedPhoto.post && (
                        <div className="flex space-x-3 flex-shrink-0 justify-items-end">
                          {/* 点赞按钮 */}
                          <EnhancedLikeButton
                            postId={selectedPhoto.post.id}
                            initialLikes={selectedPhoto.post.likesCount}
                            isLikedByUser={selectedPhoto.post.isLikedByUser}
                            onAuthRequired={handleAuthRequired}
                            variant="default"
                            className="justify-center"
                          />

                          {/* 评论按钮 */}
                          <EnhancedCommentButton
                            commentCount={selectedPhoto.post.commentsCount}
                            hasUserCommented={
                              selectedPhoto.post.hasUserCommented || false
                            }
                            onCommentClick={() => {
                              setShowCommentForm(true)
                            }}
                            onAuthRequired={handleCommentAuthRequired}
                            variant="default"
                            className="justify-center"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 下层：评论区域 - 在整体滚动中自然展开 */}
                  {selectedPhoto.post && (
                    <div className="bg-background border-t border-border/20 px-6 py-4 space-y-4">
                      {/* 评论提交成功提示 */}
                      {showCommentSubmittedMessage && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-sm text-center rounded-md">
                          {dict.comments?.commentSubmittedSuccess ||
                            '评论已提交，审核后可对外展示'}
                        </div>
                      )}

                      {/* 评论表单 - 可展开/收起 */}
                      {showCommentForm && (
                        <div ref={desktopCommentFormRef} className="space-y-3">
                          <div className="flex items-start space-x-2">
                            <div className="flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setShowCommentForm(false)
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex-1">
                              <CommentForm
                                postId={selectedPhoto.post.id}
                                compact={true}
                                onSubmitSuccess={() => {
                                  setShowCommentForm(false)
                                  setShowCommentSubmittedMessage(true)
                                  // 3秒后自动隐藏提示
                                  setTimeout(() => {
                                    setShowCommentSubmittedMessage(false)
                                  }, 3000)
                                }}
                                onAuthRequired={handleCommentAuthRequired}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 评论列表 - 只在有评论时显示 */}
                      {selectedPhoto.post.commentsCount > 0 && (
                        <div className="space-y-3">
                          <CommentList postId={selectedPhoto.post.id} />
                        </div>
                      )}

                      {/* 当没有评论且没有展开评论表单时，显示引导信息 */}
                      {selectedPhoto.post.commentsCount === 0 &&
                        !showCommentForm && (
                          <div className="flex items-center justify-center py-8 text-center text-muted-foreground">
                            <p className="text-sm">还没有评论，来说点什么吧</p>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>

              {/* 移动端：底部抽屉 */}
              <div className="md:hidden">
                {/* 底部抽屉 - 限制最大高度为 75vh，包含所有内容的整体滚动 */}
                <div className="bg-background border-t border-border/20 max-h-[75vh] flex flex-col">
                  {/* 整体滚动容器 - 包含图片、信息、评论的所有内容 */}
                  <div
                    ref={mobileScrollContainerRef}
                    className="flex-1 overflow-y-auto"
                  >
                    {/* 上层：图片显示区域 - 动态调整高度，横屏照片减少黑边 */}
                    {/* 拍立得效果的白色边框容器 pt-3 bg-whiter/90 */}
                    <div
                      className={clsx(
                        'relative pt-3 bg-white/90 dark:bg-background flex items-center justify-center flex-shrink-0',
                        isLandscape ? 'h-[35vh]' : 'h-[60vh]'
                      )}
                    >
                      <Image
                        src={selectedPhoto.imageUrl}
                        alt={selectedPhoto.title || 'A photo from the collection'}
                        width={selectedPhoto.metadata?.dimensions.width || 800}
                        height={selectedPhoto.metadata?.dimensions.height || 600}
                        className="max-w-full max-h-full object-contain"
                        sizes="100vw"
                        priority
                      />
                    </div>

                    {/* 中层：标题、描述和互动按钮区域 */}
                    <div className="bg-background p-4 flex-shrink-0">
                      {selectedPhoto.title && (
                        <h3 className="font-bold text-base mb-3 text-foreground tracking-tight leading-tight">
                          {selectedPhoto.title}
                        </h3>
                      )}
                      {selectedPhoto.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                          {selectedPhoto.description}
                        </p>
                      )}

                      {/* 互动按钮区域 */}
                      {selectedPhoto.post && (
                        <div className="mb-4">
                          <div className="flex space-x-3 justify-end">
                            {/* 点赞按钮 */}
                            <EnhancedLikeButton
                              postId={selectedPhoto.post.id}
                              initialLikes={selectedPhoto.post.likesCount}
                              isLikedByUser={selectedPhoto.post.isLikedByUser}
                              onAuthRequired={handleAuthRequired}
                              variant="default"
                              className="justify-center"
                            />

                            {/* 评论按钮 */}
                            <EnhancedCommentButton
                              commentCount={selectedPhoto.post.commentsCount}
                              hasUserCommented={
                                selectedPhoto.post.hasUserCommented || false
                              }
                              onCommentClick={() => {
                                setShowCommentForm(true)
                              }}
                              onAuthRequired={handleCommentAuthRequired}
                              variant="default"
                              className="justify-center"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 下层：评论区域 */}
                    {selectedPhoto.post && (
                      <div className="bg-background px-4 pb-4 flex-shrink-0">
                        {/* 评论提交成功提示 */}
                        {showCommentSubmittedMessage && (
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-sm text-center rounded-md mb-4">
                            {dict.comments?.commentSubmittedSuccess ||
                              '评论已提交，审核后可对外展示'}
                          </div>
                        )}

                        {/* 评论表单 - 可展开/收起，置于评论列表之上 */}
                        {showCommentForm && (
                          <div ref={mobileCommentFormRef} className="space-y-3 mb-4">
                            <CommentForm
                              postId={selectedPhoto.post.id}
                              compact={true}
                              onSubmitSuccess={() => {
                                setShowCommentForm(false)
                                setShowCommentSubmittedMessage(true)
                                // 2秒后自动隐藏提示
                                setTimeout(() => {
                                  setShowCommentSubmittedMessage(false)
                                }, 2000)
                              }}
                              onAuthRequired={handleCommentAuthRequired}
                            />
                            <button
                              onClick={() => {
                                setShowCommentForm(false)
                              }}
                              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              取消
                            </button>
                          </div>
                        )}

                        {/* 评论列表 - 只在有评论时显示 */}
                        {selectedPhoto.post.commentsCount > 0 && (
                          <div className="space-y-3">
                            <CommentList postId={selectedPhoto.post.id} />
                          </div>
                        )}

                        {/* 当没有评论且没有展开评论表单时，显示引导信息 */}
                        {selectedPhoto.post.commentsCount === 0 &&
                          !showCommentForm && (
                            <div className="flex items-center justify-center py-8 text-center text-muted-foreground">
                              <p className="text-sm">还没有评论，来说点什么吧</p>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>
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
        action={isCommentAuth ? 'comment' : 'like'}
        redirectUrl={
          typeof window !== 'undefined'
            ? `${window.location.pathname}${window.location.search}${
                pendingPhoto
                  ? (window.location.search ? '&' : '?') +
                    `photo=${pendingPhoto._id}${
                      isCommentAuth ? '&comment=true' : ''
                    }`
                  : ''
              }`
            : undefined
        }
      />
    </>
  )
}

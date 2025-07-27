// app/ui/photo-grid.tsx
'use client'

import { FadeIn } from '@/app/ui/fade-in'
import { useState } from 'react'
import Image from 'next/image'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
} from '@/app/ui/responsive-dialog'
import Masonry from 'react-masonry-css'
import { LikeButton } from '@/app/ui/like-button'
import { CommentForm } from '@/app/ui/comment-form'
import { type EnrichedPhoto } from '@/types/sanity'

export function PhotoGrid({ photos }: { photos: EnrichedPhoto[] }) {
  const [selectedPhoto, setSelectedPhoto] = useState<EnrichedPhoto | null>(null)

  // 定义断点
  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  }

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
      >
        <ResponsiveDialogContent className="p-0 md:max-w-6xl md:max-h-[95vh] bg-transparent md:bg-background border-0 md:border md:rounded-lg overflow-hidden">
          {selectedPhoto && (
            <>
              {/* 图片展示区域 - 简洁画廊风格 */}
              <div className="relative w-full md:h-[80vh] h-[70vh] p-2 md:p-4 bg-background">
                {/* 相框展示区域 */}
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* 简洁相框容器 */}
                  <div className="relative bg-white dark:bg-white p-2 md:p-3 shadow-2xl">
                    {/* 照片本体 */}
                    <div className="relative bg-black">
                      <Image
                        src={selectedPhoto.imageUrl}
                        alt={
                          selectedPhoto.title || 'A photo from the collection'
                        }
                        width={selectedPhoto.metadata?.dimensions.width || 800}
                        height={
                          selectedPhoto.metadata?.dimensions.height || 600
                        }
                        className="max-w-full max-h-[65vh] md:max-h-[70vh] w-auto h-auto object-contain"
                        sizes="(max-width: 768px) 95vw, 85vw"
                        priority
                      />

                      {/* 照片表面的微妙光泽效果 */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/3 to-transparent pointer-events-none"></div>
                    </div>
                  </div>

                  {/* 相框投影 */}
                  <div className="absolute inset-4 md:inset-6 -z-10 bg-black/20 dark:bg-black/40 blur-xl transform translate-y-4 scale-105"></div>
                </div>
              </div>

              <div className="p-4 md:p-6 bg-background border-t border-border/20">
                {/* 照片信息区域 */}
                {selectedPhoto.title && (
                  <h3 className="font-bold text-xl md:text-2xl mb-3 text-foreground tracking-tight">
                    {selectedPhoto.title}
                  </h3>
                )}
                {selectedPhoto.description && (
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    {selectedPhoto.description}
                  </p>
                )}

                {/* 互动区域 */}
                <div className="mt-6">
                  {selectedPhoto.post && (
                    <div className="mt-4 flex flex-col gap-4">
                      <LikeButton
                        postId={selectedPhoto.post.id}
                        initialLikes={selectedPhoto.post.likesCount}
                        isLikedByUser={selectedPhoto.post.isLikedByUser}
                      />
                      <CommentForm postId={selectedPhoto.post.id} />
                      <p>{selectedPhoto.post.commentsCount} Comments</p>
                      {/* 这里未来会渲染评论列表 */}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  )
}

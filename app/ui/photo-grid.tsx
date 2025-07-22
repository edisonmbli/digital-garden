// app/ui/photo-grid.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// 我们需要一个类型来描述单张照片的数据结构
type Photo = {
  _id: string
  imageUrl: string
  title?: string
  description?: string
  metadata?: {
    lqip: string // 低质量图片占位符
  }
}

export function PhotoGrid({ photos }: { photos: Photo[] }) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo._id}
            className="aspect-square rounded-lg overflow-hidden cursor-pointer"
            onClick={() => setSelectedPhoto(photo)}
          >
            <Image
              src={photo.imageUrl}
              alt={photo.title || 'A photo from the collection'}
              width={400}
              height={400}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
              placeholder="blur"
              blurDataURL={photo.metadata?.lqip}
            />
          </div>
        ))}
      </div>

      {/* 照片详情模态框 */}
      <Dialog
        open={!!selectedPhoto}
        onOpenChange={() => setSelectedPhoto(null)}
      >
        <DialogContent className="max-w-4xl">
          {selectedPhoto && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPhoto.title}</DialogTitle>
              </DialogHeader>
              <div className="relative aspect-video">
                <Image
                  src={selectedPhoto.imageUrl}
                  alt={selectedPhoto.title || 'A photo from the collection'}
                  fill
                  className="object-contain"
                />
              </div>
              {/* 在这里可以添加照片描述、点赞评论区等 */}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

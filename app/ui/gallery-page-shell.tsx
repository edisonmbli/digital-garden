// app/ui/gallery-page-shell.tsx
import type { FeaturedGroup } from '@/types/sanity'
import Image from 'next/image'

interface GalleryPageShellProps {
  collections: FeaturedGroup[]
}

export function GalleryPageShell({ collections }: GalleryPageShellProps) {
  return (
    <div className="w-full py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {collections.map((collection) => (
            <div
              key={collection._id}
              className="group relative h-80 rounded-lg overflow-hidden bg-muted cursor-pointer transition-transform duration-300 hover:scale-105"
            >
              {/* 背景图片 */}
              {collection.coverImageUrl ? (
                <Image
                  src={collection.coverImageUrl}
                  alt={collection.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              ) : (
                <div className="absolute inset-0 bg-muted" />
              )}

              {/* 渐变遮罩层 - 从透明到半透明黑色 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

              {/* 文字内容 */}
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <h2 className="text-2xl font-bold text-white text-center drop-shadow-lg">
                  {collection.name}
                </h2>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

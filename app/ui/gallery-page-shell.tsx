// app/ui/gallery-page-shell.tsx
import type { FeaturedGroup } from '@/types/sanity'
import type { Locale } from '@/i18n-config'
import Image from 'next/image'
import Link from 'next/link'

interface GalleryPageShellProps {
  collections: FeaturedGroup[]
  lang: Locale
}

export function GalleryPageShell({ collections, lang }: GalleryPageShellProps) {
  return (
    <div className="w-full py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {collections.map((collection) => {
            // 根据语言动态选择对应的名称
            const collectionName =
              lang === 'en'
                ? collection.name?.en || collection.name?.zh || 'Untitled'
                : collection.name?.zh || collection.name?.en || '无标题'

            return (
              <Link
                key={collection._id}
                href={`/${lang}/gallery/${collection.slug}`}
                className="group relative h-80 rounded-lg overflow-hidden bg-muted cursor-pointer transition-transform duration-300 hover:scale-105 block"
              >
                {/* 背景图片 */}
                {collection.coverImageUrl ? (
                  <Image
                    src={collection.coverImageUrl}
                    alt={collectionName}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-muted" />
                )}

                {/* 渐变遮罩层 - 从透明到半透明黑色 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/15 to-transparent" />

                {/* 文字内容 */}
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <h2 className="text-display-md text-white bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-center drop-shadow-lg">
                    {collectionName}
                  </h2>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

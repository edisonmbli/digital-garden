// app/ui/infinite-photo-grid.tsx
'use client'

import { useState, useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { PhotoGrid } from './photo-grid' // 我们复用之前的照片网格UI组件
import { loadMorePhotosAction } from '@/lib/actions'
import { type Locale } from '@/i18n-config'
import { useI18n } from '@/app/context/i18n-provider'

// 定义照片的类型
type Photo = { _id: string; imageUrl: string /* ...其他字段... */ }

interface InfinitePhotoGridProps {
  initialPhotos: Photo[]
  collectionSlug: string
  lang: Locale
}

export function InfinitePhotoGrid({
  initialPhotos,
  collectionSlug,
  lang,
}: InfinitePhotoGridProps) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [page, setPage] = useState(2) // 我们从第二页开始加载
  const [hasMore, setHasMore] = useState(true) // 新增 state，默认认为还有更多
  const [isLoading, setIsLoading] = useState(false) // 新增 loading 状态，防止重复加载

  const dictionary = useI18n() //在组件内部，直接获取字典

  const { ref, inView } = useInView()

  useEffect(() => {
    // 只有在“哨兵”可见，且“还有更多”，且“不在加载中”时，才触发
    if (inView && hasMore && !isLoading) {
      setIsLoading(true)
      loadMorePhotosAction(collectionSlug, lang, page).then((res) => {
        if (res.photos.length > 0) {
          setPhotos((prevPhotos) => [...prevPhotos, ...res.photos])
          setPage((prevPage) => prevPage + 1)
        }
        // 更新“是否还有更多”的状态
        setHasMore(res.hasMore)
        setIsLoading(false)
      })
    }
  }, [inView, hasMore, isLoading, collectionSlug, lang, page])

  return (
    <>
      <PhotoGrid photos={photos} />

      {/* 只有在“还有更多”时，才显示“加载中”的提示 */}
      <div ref={ref} className="mt-8 text-center">
        {hasMore
          ? isLoading
            ? dictionary.gallery.loading
            : ''
          : dictionary.gallery.allPhotosLoaded}
      </div>
    </>
  )
}

// app/lib/actions.ts
'use server'

import { PHOTOS_PER_PAGE } from './dal'
import { getGroupAndPhotosBySlug } from './dal'
import { type Locale } from '@/i18n-config'

export async function loadMorePhotosAction(
  slug: string,
  lang: Locale,
  page: number
) {
  // 我们直接复用 DAL 函数来获取下一页的数据
  const groupData = await getGroupAndPhotosBySlug(slug, lang, page)

  const newPhotos = groupData?.photos || []

  // 关键新增：判断是否还有更多数据
  // 如果这次获取到的照片数量，小于我们每页期望的数量，
  // 那就说明这已经是最后一页了。
  const hasMore = newPhotos.length === PHOTOS_PER_PAGE

  // 将照片和“是否还有更多”的标志，一并返回
  return {
    photos: newPhotos,
    hasMore: hasMore,
  }
}

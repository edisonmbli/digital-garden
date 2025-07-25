// app/lib/actions.ts
'use server'

import { PHOTOS_PER_PAGE } from './dal'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import * as dal from './dal'
import { type Locale } from '@/i18n-config'

// 加载更多照片的 Server Action
export async function loadMorePhotosAction(
  slug: string,
  lang: Locale,
  page: number
) {
  // 我们直接复用 DAL 函数来获取下一页的数据
  const groupData = await dal.getGroupAndPhotosBySlug(slug, lang, page)

  // 确保 groupData 存在，且包含 photos 字段
  const newPhotos = groupData?.photos || []

  // 判断是否还有更多数据（如果这次获取到的照片数量，小于我们每页期望的数量，
  // 那就说明这已经是最后一页了。）
  const hasMore = newPhotos.length === PHOTOS_PER_PAGE

  // 将照片和"是否还有更多"的标志，一并返回
  return {
    photos: newPhotos,
    hasMore: hasMore,
  }
}

// 获取翻译映射的 Server Action
export async function getTranslationMapAction(
  slug: string,
  lang: Locale,
  type: 'collection' | 'log'
): Promise<Record<string, string>> {
  try {
    const translations = await dal.getTranslationsBySlug({ slug, lang, type })

    // 将翻译数组转换为映射对象
    return translations.reduce((acc, t) => {
      acc[t.language] = t.slug
      return acc
    }, {} as Record<string, string>)
  } catch (error) {
    console.error('Failed to fetch translation map:', error)
    return {}
  }
}

const commentSchema = z.string().min(1, 'Comment cannot be empty.').max(500)

// 评论提交的 Server Action
export async function commentAction(postId: string, formData: FormData) {
  const content = formData.get('comment') as string

  // Zod 校验
  const validation = commentSchema.safeParse(content)
  if (!validation.success) {
    return { error: validation.error.format()._errors.join(',') }
  }

  try {
    // 调用 DAL 执行数据库写入
    await dal.createComment(postId, validation.data)
    // 让与此 Post 相关的缓存失效
    revalidateTag(`post-interactions:${postId}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to create comment:', error)
    return { error: 'Failed to create comment.' }
  }
}

// 点赞的 Server Action
export async function likeAction(postId: string) {
  try {
    await dal.likePost(postId)
    revalidateTag(`post-interactions:${postId}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to like post:', error)
    return { error: 'Failed to like post.' }
  }
}

// 删除评论的 Server Action
export async function deleteCommentAction(commentId: string) {
  try {
    // 调用 DAL 执行删除，并获取被删除评论的 postId
    const postId = await dal.deleteComment(commentId)
    // 精确地让与此 Post 相关的缓存失效
    revalidateTag(`post-interactions:${postId}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to delete comment:', error)
    return { error: 'Failed to delete comment.' }
  }
}

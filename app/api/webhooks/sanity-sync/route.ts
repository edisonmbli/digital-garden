import { NextRequest, NextResponse } from 'next/server'
import { isValidSignature, SIGNATURE_HEADER_NAME } from '@sanity/webhook'
import { revalidateTag } from 'next/cache'
import { client } from '@/sanity/client'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withWebhookMonitoring } from '@/lib/sentry-api-integration'

// The simplified payload from the webhook
// Define a more accurate type for the document part of the payload
type SanityDocument = {
  _id: string
  _type: string
  language?: string
  // Add other potential fields from Sanity documents as optional
  _createdAt?: string
  _updatedAt?: string
  _rev?: string
  name?: string | { en?: string; zh?: string }
  title?: string
  description?: string | { en?: string; zh?: string }
  // Collection specific fields (field-level i18n)
  nameEn?: string
  nameZh?: string
  descriptionEn?: string
  descriptionZh?: string
  slug?: { _type: 'slug'; current: string }
  isFeatured?: boolean
  publishedAt?: string
  excerpt?: string
  tags?: string[]
  coverImageUrl?: string
  // Photo specific fields
  sanityAssetId?: string
  titleJson?: string
  descriptionJson?: string
  // Author specific fields
  bio?: Array<Record<string, unknown>> // PortableText blocks
  socialLinks?: Array<{
    platform: string
    url: string
  }>
  profileImage?: {
    asset: {
      _ref: string
    }
  }
}

// Define the webhook payload based on beforeState/afterState
type SanityWebhookPayload = {
  operation: 'create' | 'update' | 'delete'
  beforeState: SanityDocument | null
  afterState: SanityDocument | null
}

// Next.js will by default parse the body, which can lead to invalid signatures
export const config = {
  api: {
    bodyParser: false,
  },
}

// Rate limiting function
async function checkRateLimit(): Promise<boolean> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const rateLimit = parseInt(process.env.WEBHOOK_RATE_LIMIT_PER_HOUR || '200')

    const recentCalls = await prisma.webhookCall.count({
      where: {
        createdAt: {
          gte: oneHourAgo,
        },
      },
    })

    const isAllowed = recentCalls < rateLimit

    logger.debug('WebhookRateLimit', '检查Webhook限流状态', {
      recentCalls,
      rateLimit,
      isAllowed,
    })

    return isAllowed
  } catch (error) {
    logger.error('WebhookRateLimit', '限流检查失败', error as Error)
    return true // Allow on error to avoid blocking legitimate requests
  }
}

// Record webhook call
async function recordWebhookCall(
  operation: string,
  documentType: string,
  documentId: string,
  success: boolean,
  error?: string
) {
  try {
    await prisma.webhookCall.create({
      data: {
        operation,
        documentType,
        documentId,
        success,
        error,
      },
    })

    logger.info('WebhookRecord', 'Webhook调用记录已保存', {
      operation,
      documentType,
      documentId,
      success,
      error,
    })
  } catch (err) {
    logger.error('WebhookRecord', '保存Webhook调用记录失败', err as Error, {
      operation,
      documentType,
      documentId,
      success,
      error,
    })
    // 不抛出错误，避免影响主要的 webhook 处理流程
  }
}

async function getI18nInfo(documentId: string): Promise<{
  i18n_id: string
  i18n_lang: string | null
  related_document_ids: string[]
}> {
  if (!documentId) {
    logger.warn('WebhookI18n', 'getI18nInfo调用时缺少documentId')
    return { i18n_id: '', i18n_lang: null, related_document_ids: [] }
  }

  logger.debug('WebhookI18n', '开始获取文档国际化信息', { documentId })

  const query = `
    {
      "i18n_metadata": *[_type == "translation.metadata" && $documentId in translations[].value._ref][0] {
        "i18n_id": _id,
        "related_document_ids": translations[].value._ref
      },
      "i18n_lang": *[_id==$documentId][0].language
    }
  `
  const params = { documentId }
  try {
    logger.debug('WebhookI18n', 'Executing GROQ query with timeout', { documentId })

    const queryPromise = client.fetch(query, params)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(new Error(`Query timeout for ${documentId} after 10 seconds`)),
        10000
      )
    )

    const result = await Promise.race([queryPromise, timeoutPromise])

    logger.debug('WebhookI18n', 'i18n query result', { 
      documentId, 
      result: JSON.stringify(result, null, 2) 
    })

    const i18n_id = result?.i18n_metadata?.i18n_id || documentId
    const related_document_ids = result?.i18n_metadata
      ?.related_document_ids || [documentId]
    const i18n_lang = result?.i18n_lang || null

    logger.debug('WebhookI18n', 'Final i18n info extracted', {
      i18n_id,
      i18n_lang,
      related_document_ids
    })

    return {
      i18n_id,
      i18n_lang,
      related_document_ids,
    }
  } catch (error) {
    logger.error('WebhookI18n', 'Error fetching i18n info', error as Error, { documentId })
    logger.info('WebhookI18n', 'Falling back to document ID as i18n_id', { documentId })

    try {
      logger.debug('WebhookI18n', 'Attempting to get language info only', { documentId })
      const langQuery = `*[_id==$documentId][0].language`
      const langResult = await Promise.race([
        client.fetch(langQuery, params),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`Language query timeout for ${documentId}`)),
            5000
          )
        ),
      ])
      logger.debug('WebhookI18n', 'Language fallback result', { documentId, langResult })
      return {
        i18n_id: documentId,
        i18n_lang: langResult || null,
        related_document_ids: [documentId],
      }
    } catch (langError) {
      logger.error('WebhookI18n', 'Language fallback also failed', langError as Error, { documentId })
      return {
        i18n_id: documentId,
        i18n_lang: null,
        related_document_ids: [documentId],
      }
    }
  }
}

// Function to handle log i18n consolidation
async function consolidateLogI18nRecords(
  i18n_id: string,
  related_document_ids: string[],
  language: string
): Promise<{ postId: string; shouldCreateLog: boolean }> {
  return await prisma.$transaction(async (tx) => {
    logger.debug('WebhookLogI18n', 'Consolidating log i18n records', {
      i18n_id,
      related_document_ids,
      language
    })

    // 1. Find an existing post using either the i18n_id or any of the related document IDs
    let existingPost = await tx.post.findFirst({
      where: {
        sanityDocumentId: {
          in: [i18n_id, ...related_document_ids],
        },
      },
    })

    if (existingPost) {
      logger.debug('WebhookLogI18n', 'Found existing post', {
        postId: existingPost.id,
        sanityDocumentId: existingPost.sanityDocumentId
      })

      // If the post is not using the main i18n_id, update it
      if (existingPost.sanityDocumentId !== i18n_id) {
        logger.info('WebhookLogI18n', 'Migrating post to use i18n_id', {
          postId: existingPost.id,
          from: existingPost.sanityDocumentId,
          to: i18n_id
        })
        existingPost = await tx.post.update({
          where: { id: existingPost.id },
          data: { sanityDocumentId: i18n_id },
        })
        logger.info('WebhookLogI18n', 'Post updated to use i18n_id', { postId: existingPost.id })
      }

      // Check if a log entry for this language already exists
      const existingLog = await tx.log.findUnique({
        where: {
          postId_language: {
            postId: existingPost.id,
            language: language,
          },
        },
      })

      logger.debug('WebhookLogI18n', 'Checked existing log', {
        postId: existingPost.id,
        language,
        hasExistingLog: !!existingLog
      })

      return {
        postId: existingPost.id,
        shouldCreateLog: !existingLog,
      }
    }

    // 2. No existing post found, create a new one with the main i18n_id
    logger.info('WebhookLogI18n', 'No existing post found, creating new post', { i18n_id })
    const newPost = await tx.post.create({
      data: {
        sanityDocumentId: i18n_id, // Use the translation group ID
        contentType: 'log',
        authorId: process.env.AUTHOR_USER_ID || 'default-author',
      },
    })

    logger.info('WebhookLogI18n', 'New post created', { postId: newPost.id })

    return {
      postId: newPost.id,
      shouldCreateLog: true, // Always create a log for a new post
    }
  })
}

async function handleCollectionCreate(
  payload: SanityDocument & { i18n_id: string; i18n_lang: string | null }
) {
  // Extract i18n data from object-level structure
  const nameObj = payload.name as
    | { en?: string; zh?: string }
    | string
    | undefined
  const descObj = payload.description as
    | { en?: string; zh?: string }
    | string
    | undefined

  const nameEn =
    typeof nameObj === 'object' ? nameObj?.en || '' : payload.nameEn || ''
  const nameZh =
    typeof nameObj === 'object' ? nameObj?.zh || '' : payload.nameZh || ''
  const descriptionEn =
    typeof descObj === 'object'
      ? descObj?.en || null
      : payload.descriptionEn || null
  const descriptionZh =
    typeof descObj === 'object'
      ? descObj?.zh || null
      : payload.descriptionZh || null

  logger.info('WebhookCollection', 'Processing Collection create operation', {
    id: payload._id,
    nameEn,
    nameZh,
    slug: payload.slug?.current,
    isFeatured: payload.isFeatured,
  })

  try {
    // Check if collection already exists
    const existing = await prisma.collection.findUnique({
      where: {
        sanityId: payload._id,
      },
    })

    if (existing) {
      logger.debug('WebhookCollection', 'Collection already exists, skipping creation', { id: payload._id })
      return
    }

    await prisma.collection.create({
      data: {
        sanityId: payload._id,
        nameEn,
        nameZh,
        slug: payload.slug?.current || '',
        descriptionEn,
        descriptionZh,
        isFeatured: payload.isFeatured || false,
      },
    })

    logger.info('WebhookCollection', 'Collection created successfully', { id: payload._id })
  } catch (error) {
    logger.error('WebhookCollection', 'Error creating collection', error as Error, { id: payload._id })
    throw error
  }
}

async function handleCollectionUpdate(
  payload: SanityDocument & { i18n_id: string; i18n_lang: string | null }
) {
  // Extract i18n data from object-level structure
  const nameObj = payload.name as
    | { en?: string; zh?: string }
    | string
    | undefined
  const descObj = payload.description as
    | { en?: string; zh?: string }
    | string
    | undefined

  const nameEn =
    typeof nameObj === 'object' ? nameObj?.en || '' : payload.nameEn || ''
  const nameZh =
    typeof nameObj === 'object' ? nameObj?.zh || '' : payload.nameZh || ''
  const descriptionEn =
    typeof descObj === 'object'
      ? descObj?.en || null
      : payload.descriptionEn || null
  const descriptionZh =
    typeof descObj === 'object'
      ? descObj?.zh || null
      : payload.descriptionZh || null

  logger.info('WebhookCollection', 'Processing Collection update operation', {
    id: payload._id,
    nameEn,
    nameZh,
    slug: payload.slug?.current,
    isFeatured: payload.isFeatured,
  })

  try {
    // Use upsert to handle both update and create cases
    const result = await prisma.collection.upsert({
      where: {
        sanityId: payload._id,
      },
      update: {
        nameEn,
        nameZh,
        slug: payload.slug?.current || '',
        descriptionEn,
        descriptionZh,
        isFeatured: payload.isFeatured || false,
      },
      create: {
        sanityId: payload._id,
        nameEn,
        nameZh,
        slug: payload.slug?.current || '',
        descriptionEn,
        descriptionZh,
        isFeatured: payload.isFeatured || false,
      },
    })

    logger.info('WebhookCollection', 'Collection upserted successfully', { 
      id: payload._id, 
      resultId: result.id, 
      nameEn: result.nameEn 
    })
  } catch (error) {
    logger.error('WebhookCollection', 'Error upserting collection', error as Error, { id: payload._id })
    throw error
  }
}

async function handleCollectionDelete(
  payload: SanityDocument & { i18n_id: string; i18n_lang: string | null }
) {
  logger.info('WebhookCollection', 'Processing Collection delete operation', {
    id: payload._id,
    i18n_id: payload.i18n_id,
  })

  try {
    // Soft delete - mark as deleted but keep the data
    const updated = await prisma.collection.updateMany({
      where: {
        sanityId: payload._id,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    })

    logger.info('WebhookCollection', 'Collection soft deleted successfully', { 
      id: payload._id, 
      count: updated.count 
    })
    await recordWebhookCall('delete', 'collection', payload._id, true)
  } catch (error) {
    logger.error('WebhookCollection', 'Error deleting collection', error as Error, { id: payload._id })
    await recordWebhookCall(
      'delete',
      'collection',
      payload._id,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    )
    throw error
  }
}

// DevCollection handlers
async function handleDevCollectionCreate(
  payload: SanityDocument & { i18n_id: string; i18n_lang: string | null }
) {
  // Extract i18n data from object-level structure
  const nameObj = payload.name as
    | { en?: string; zh?: string }
    | string
    | undefined
  const descObj = payload.description as
    | { en?: string; zh?: string }
    | string
    | undefined

  const nameEn =
    typeof nameObj === 'object' ? nameObj?.en || '' : payload.nameEn || ''
  const nameZh =
    typeof nameObj === 'object' ? nameObj?.zh || '' : payload.nameZh || ''
  const descriptionEn =
    typeof descObj === 'object'
      ? descObj?.en || null
      : payload.descriptionEn || null
  const descriptionZh =
    typeof descObj === 'object'
      ? descObj?.zh || null
      : payload.descriptionZh || null

  logger.info('WebhookDevCollection', 'Processing DevCollection create operation', {
    id: payload._id,
    nameEn,
    nameZh,
    slug: payload.slug?.current,
    isFeatured: payload.isFeatured,
  })

  try {
    // Check if devCollection already exists
    const existing = await prisma.devCollection.findUnique({
      where: {
        sanityId: payload._id,
      },
    })

    if (existing) {
      logger.debug('WebhookDevCollection', 'DevCollection already exists, skipping creation', { id: payload._id })
      return
    }

    await prisma.devCollection.create({
      data: {
        sanityId: payload._id,
        nameEn,
        nameZh,
        slug: payload.slug?.current || '',
        descriptionEn,
        descriptionZh,
        isFeatured: payload.isFeatured || false,
        coverImageUrl: payload.coverImageUrl || null,
      },
    })

    logger.info('WebhookDevCollection', 'DevCollection created successfully', { id: payload._id })
  } catch (error) {
    logger.error('WebhookDevCollection', 'Error creating devCollection', error as Error, { id: payload._id })
    throw error
  }
}

async function handleDevCollectionUpdate(
  payload: SanityDocument & { i18n_id: string; i18n_lang: string | null }
) {
  // Extract i18n data from object-level structure
  const nameObj = payload.name as
    | { en?: string; zh?: string }
    | string
    | undefined
  const descObj = payload.description as
    | { en?: string; zh?: string }
    | string
    | undefined

  const nameEn =
    typeof nameObj === 'object' ? nameObj?.en || '' : payload.nameEn || ''
  const nameZh =
    typeof nameObj === 'object' ? nameObj?.zh || '' : payload.nameZh || ''
  const descriptionEn =
    typeof descObj === 'object'
      ? descObj?.en || null
      : payload.descriptionEn || null
  const descriptionZh =
    typeof descObj === 'object'
      ? descObj?.zh || null
      : payload.descriptionZh || null

  logger.info('WebhookDevCollection', 'Processing DevCollection update operation', {
    id: payload._id,
    nameEn,
    nameZh,
    slug: payload.slug?.current,
    isFeatured: payload.isFeatured,
  })

  try {
    // Use upsert to handle both update and create cases
    const result = await prisma.devCollection.upsert({
      where: {
        sanityId: payload._id,
      },
      update: {
        nameEn,
        nameZh,
        slug: payload.slug?.current || '',
        descriptionEn,
        descriptionZh,
        isFeatured: payload.isFeatured || false,
        coverImageUrl: payload.coverImageUrl || null,
      },
      create: {
        sanityId: payload._id,
        nameEn,
        nameZh,
        slug: payload.slug?.current || '',
        descriptionEn,
        descriptionZh,
        isFeatured: payload.isFeatured || false,
        coverImageUrl: payload.coverImageUrl || null,
      },
    })

    logger.info('WebhookDevCollection', 'DevCollection upserted successfully', { 
      id: payload._id, 
      resultId: result.id, 
      nameEn: result.nameEn 
    })
  } catch (error) {
    logger.error('WebhookDevCollection', 'Error upserting devCollection', error as Error, { id: payload._id })
    throw error
  }
}

async function handleDevCollectionDelete(
  payload: SanityDocument & { i18n_id: string; i18n_lang: string | null }
) {
  logger.info('WebhookDevCollection', 'Processing DevCollection delete operation', {
    id: payload._id,
    i18n_id: payload.i18n_id,
  })

  try {
    // Soft delete - mark as deleted but keep the data
    const updated = await prisma.devCollection.updateMany({
      where: {
        sanityId: payload._id,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    })

    logger.info('WebhookDevCollection', 'DevCollection soft deleted successfully', { 
      id: payload._id, 
      count: updated.count 
    })
    await recordWebhookCall('delete', 'devCollection', payload._id, true)
  } catch (error) {
    logger.error('WebhookDevCollection', 'Error deleting devCollection', error as Error, { id: payload._id })
    await recordWebhookCall(
      'delete',
      'devCollection',
      payload._id,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    )
    throw error
  }
}

async function handleLogCreate(
  payload: SanityDocument & {
    i18n_id: string
    i18n_lang: string | null
    related_document_ids: string[]
  }
) {
  logger.info('WebhookLog', 'Processing Log create operation', {
    id: payload._id,
    i18n_id: payload.i18n_id,
    lang: payload.i18n_lang,
    title: payload.title,
  })

  try {
    const language = payload.language || 'en'

    // Use the new consolidation logic
    const { postId, shouldCreateLog } = await consolidateLogI18nRecords(
      payload.i18n_id,
      payload.related_document_ids,
      language
    )

    if (!shouldCreateLog) {
      logger.debug('WebhookLog', 'Log entry for this language already exists, skipping creation', {
        id: payload._id,
        language
      })
      return
    }

    // Create log entry
    await prisma.log.create({
      data: {
        postId: postId,
        title: payload.title || '',
        slug: payload.slug?.current || '',
        excerpt: payload.excerpt || null,
        publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : null,
        tags: payload.tags || [],
        language: language,
      },
    })

    logger.info('WebhookLog', 'Log created successfully', { id: payload._id, postId, language })
  } catch (error) {
    logger.error('WebhookLog', 'Error creating log', error as Error, { id: payload._id })
    throw error
  }
}

async function handleLogUpdate(
  payload: SanityDocument & {
    i18n_id: string
    i18n_lang: string | null
    related_document_ids: string[]
  }
) {
  logger.info('WebhookLog', 'Processing Log update operation', {
    id: payload._id,
    i18n_id: payload.i18n_id,
    lang: payload.i18n_lang,
    title: payload.title,
  })

  try {
    const language = payload.language || 'en'

    // Use the new consolidation logic
    const { postId, shouldCreateLog } = await consolidateLogI18nRecords(
      payload.i18n_id,
      payload.related_document_ids,
      language
    )

    if (shouldCreateLog) {
      // If log doesn't exist, create it
      await prisma.log.create({
        data: {
          postId: postId,
          title: payload.title || '',
          slug: payload.slug?.current || '',
          excerpt: payload.excerpt || null,
          publishedAt: payload.publishedAt
            ? new Date(payload.publishedAt)
            : null,
          tags: payload.tags || [],
          language: language,
        },
      })
      logger.info('WebhookLog', 'Log created during update operation', { id: payload._id, postId, language })
    } else {
      // Update existing log entry
      await prisma.log.updateMany({
        where: {
          postId: postId,
          language: language,
        },
        data: {
          title: payload.title || '',
          slug: payload.slug?.current || '',
          excerpt: payload.excerpt || null,
          publishedAt: payload.publishedAt
            ? new Date(payload.publishedAt)
            : null,
          tags: payload.tags || [],
        },
      })
      logger.info('WebhookLog', 'Log updated successfully', { id: payload._id, postId, language })
    }
  } catch (error) {
    logger.error('WebhookLog', 'Error updating log', error as Error, { id: payload._id })
    throw error
  }
}

async function handleLogDelete(
  payload: SanityDocument & { i18n_id: string; i18n_lang: string | null }
) {
  logger.info('WebhookLog', 'Processing Log delete operation', {
    id: payload._id,
    i18n_id: payload.i18n_id,
  })

  try {
    const documentId = payload.i18n_id

    // Soft delete the post - this preserves all social interaction data
    const updated = await prisma.post.updateMany({
      where: {
        sanityDocumentId: documentId,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    })

    logger.info('WebhookLog', 'Log post soft deleted successfully', {
      documentId,
      count: updated.count
    })
    await recordWebhookCall('delete', 'log', documentId, true)
  } catch (error) {
    logger.error('WebhookLog', 'Error deleting log', error as Error, { id: payload._id })
    await recordWebhookCall(
      'delete',
      'log',
      payload.i18n_id,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    )
    throw error
  }
}

async function handlePhotoCreate(
  payload: SanityDocument & { i18n_id: string; i18n_lang: string | null }
) {
  // Convert Sanity's title and description objects to JSON strings
  const titleJson = payload.title ? JSON.stringify(payload.title) : null
  const descriptionJson = payload.description
    ? JSON.stringify(payload.description)
    : null

  logger.info('WebhookPhoto', 'Processing Photo create operation', {
    id: payload._id,
    hasTitle: !!titleJson,
    hasDescription: !!descriptionJson,
  })

  try {
    // For photos, we use the actual _id since photos don't support internationalization
    const documentId = payload._id

    // Check if post already exists
    let post = await prisma.post.findUnique({
      where: { sanityDocumentId: documentId },
    })

    if (!post) {
      // Create new post
      post = await prisma.post.create({
        data: {
          sanityDocumentId: documentId,
          contentType: 'photo',
          authorId: process.env.AUTHOR_USER_ID || 'default-author',
        },
      })
    }

    // Check if photo already exists
    const existingPhoto = await prisma.photo.findUnique({
      where: { postId: post.id },
    })

    if (existingPhoto) {
      logger.debug('WebhookPhoto', 'Photo already exists, skipping creation', { id: payload._id })
      return
    }

    // Create photo entry
    await prisma.photo.create({
      data: {
        postId: post.id,
        sanityAssetId: payload.sanityAssetId || null,
        titleJson,
        descriptionJson,
      },
    })

    logger.info('WebhookPhoto', 'Photo created successfully', { id: payload._id, postId: post.id })
  } catch (error) {
    logger.error('WebhookPhoto', 'Error creating photo', error as Error, { id: payload._id })
    throw error
  }
}

async function handlePhotoUpdate(
  payload: SanityDocument & { i18n_id: string; i18n_lang: string | null }
) {
  // Convert Sanity's title and description objects to JSON strings
  const titleJson = payload.title ? JSON.stringify(payload.title) : null
  const descriptionJson = payload.description
    ? JSON.stringify(payload.description)
    : null

  logger.info('WebhookPhoto', 'Processing Photo update operation', {
    id: payload._id,
    hasTitle: !!titleJson,
    hasDescription: !!descriptionJson,
  })

  try {
    const documentId = payload._id

    // Find the post
    const post = await prisma.post.findUnique({
      where: { sanityDocumentId: documentId },
      include: { photo: true },
    })

    if (!post) {
      logger.debug('WebhookPhoto', 'Post not found, creating new one', { id: payload._id })
      await handlePhotoCreate(payload)
      return
    }

    if (!post.photo) {
      // Create photo entry if it doesn't exist
      await prisma.photo.create({
        data: {
          postId: post.id,
          sanityAssetId: payload.sanityAssetId || null,
          titleJson,
          descriptionJson,
        },
      })
    } else {
      // Update photo entry
      await prisma.photo.update({
        where: { postId: post.id },
        data: {
          sanityAssetId: payload.sanityAssetId || null,
          titleJson,
          descriptionJson,
        },
      })
    }

    logger.info('WebhookPhoto', 'Photo updated successfully', { id: payload._id, postId: post.id })
  } catch (error) {
    logger.error('WebhookPhoto', 'Error updating photo', error as Error, { id: payload._id })
    throw error
  }
}

async function handlePhotoDelete(
  payload: SanityDocument & { i18n_id: string; i18n_lang: string | null }
) {
  logger.info('WebhookPhoto', 'Processing Photo delete operation', {
    id: payload._id,
  })

  try {
    const documentId = payload._id

    // Soft delete the post - this preserves all social interaction data
    const updated = await prisma.post.updateMany({
      where: {
        sanityDocumentId: documentId,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    })

    logger.info('WebhookPhoto', 'Photo post soft deleted successfully', {
      documentId,
      count: updated.count
    })
    await recordWebhookCall('delete', 'photo', documentId, true)
  } catch (error) {
    logger.error('WebhookPhoto', 'Error deleting photo', error as Error, { id: payload._id })
    await recordWebhookCall(
      'delete',
      'photo',
      payload._id,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    )
    throw error
  }
}

// Author handlers
async function handleAuthorCreate(
  payload: SanityDocument & { i18n_id: string; i18n_lang: string | null }
) {
  logger.info('WebhookAuthor', 'Processing Author create operation', {
    id: payload._id,
    slug: payload.slug?.current,
  })

  try {
    // Author documents don't need database storage in this system
    // They are fetched directly from Sanity when needed
    // Just trigger revalidation for about pages
    revalidateTag('author-data')

    logger.info('WebhookAuthor', 'Author created, about pages revalidated', { id: payload._id })
  } catch (error) {
    logger.error('WebhookAuthor', 'Error handling author creation', error as Error, { id: payload._id })
    throw error
  }
}

async function handleAuthorUpdate(
  payload: SanityDocument & { i18n_id: string; i18n_lang: string | null }
) {
  logger.info('WebhookAuthor', 'Processing Author update operation', {
    id: payload._id,
    slug: payload.slug?.current,
  })

  try {
    // Trigger revalidation for about pages when author data changes
    revalidateTag('author-data')

    logger.info('WebhookAuthor', 'Author updated, about pages revalidated', { id: payload._id })
  } catch (error) {
    logger.error('WebhookAuthor', 'Error handling author update', error as Error, { id: payload._id })
    throw error
  }
}

async function handleAuthorDelete(
  payload: SanityDocument & { i18n_id: string; i18n_lang: string | null }
) {
  logger.info('WebhookAuthor', 'Processing Author delete operation', {
    id: payload._id,
    slug: payload.slug?.current,
  })

  try {
    // Trigger revalidation for about pages when author is deleted
    revalidateTag('author-data')

    logger.info('WebhookAuthor', 'Author deleted, about pages revalidated', { id: payload._id })
  } catch (error) {
    logger.error('WebhookAuthor', 'Error handling author deletion', error as Error, { id: payload._id })
    throw error
  }
}

export const POST = withWebhookMonitoring(async (request: NextRequest) => {
  try {
    // 1. Rate limiting check
    const withinRateLimit = await checkRateLimit()
    if (!withinRateLimit) {
      logger.warn('WebhookMain', 'Webhook rate limit exceeded')
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // 2. 验证签名
    const signature = request.headers.get(SIGNATURE_HEADER_NAME)
    const body = await request.text()

    if (!process.env.SANITY_WEBHOOK_SECRET) {
      logger.error('WebhookMain', 'SANITY_WEBHOOK_SECRET is not set')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    if (
      !signature ||
      !isValidSignature(body, signature, process.env.SANITY_WEBHOOK_SECRET)
    ) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 3. 解析 Payload
    const payload: SanityWebhookPayload = JSON.parse(body)

    // This is the crucial change
    const document =
      payload.operation === 'delete' ? payload.beforeState : payload.afterState

    if (!document) {
      logger.error('WebhookMain', 'Document data is missing in payload', new Error('Missing document'), { payload })
      return NextResponse.json(
        { error: 'Document data is missing in payload' },
        { status: 400 }
      )
    }

    logger.info('WebhookMain', 'Sanity webhook received', {
      operation: payload.operation,
      type: document._type,
      id: document._id,
    })

    // 4. Get i18n info
    const { i18n_id, i18n_lang, related_document_ids } = await getI18nInfo(
      document._id
    )

    // Combine the original document data with the fetched i18n info
    const documentWithI18n = {
      ...document,
      i18n_id,
      i18n_lang,
      related_document_ids,
    }

    // 5. Record webhook call and handle operations
    let success = true
    let error: string | undefined

    try {
      switch (document._type) {
        case 'collection':
          switch (payload.operation) {
            case 'create':
              await handleCollectionCreate(documentWithI18n)
              break
            case 'update':
              await handleCollectionUpdate(documentWithI18n)
              break
            case 'delete':
              await handleCollectionDelete(documentWithI18n)
              break
          }
          break

        case 'devCollection':
          switch (payload.operation) {
            case 'create':
              await handleDevCollectionCreate(documentWithI18n)
              break
            case 'update':
              await handleDevCollectionUpdate(documentWithI18n)
              break
            case 'delete':
              await handleDevCollectionDelete(documentWithI18n)
              break
          }
          break

        case 'log':
          switch (payload.operation) {
            case 'create':
              await handleLogCreate(documentWithI18n)
              break
            case 'update':
              await handleLogUpdate(documentWithI18n)
              break
            case 'delete':
              await handleLogDelete(documentWithI18n)
              break
          }
          break

        case 'photo':
          switch (payload.operation) {
            case 'create':
              await handlePhotoCreate(documentWithI18n)
              break
            case 'update':
              await handlePhotoUpdate(documentWithI18n)
              break
            case 'delete':
              await handlePhotoDelete(documentWithI18n)
              break
          }
          break

        case 'author':
          switch (payload.operation) {
            case 'create':
              await handleAuthorCreate(documentWithI18n)
              break
            case 'update':
              await handleAuthorUpdate(documentWithI18n)
              break
            case 'delete':
              await handleAuthorDelete(documentWithI18n)
              break
          }
          break

        default:
          logger.warn('WebhookMain', 'Unhandled document type', { type: document._type })
      }
    } catch (err) {
      success = false
      error = err instanceof Error ? err.message : 'Unknown error'
      logger.error('WebhookMain', 'Error handling webhook operation', err as Error, {
        operation: payload.operation,
        type: document._type,
        id: document._id
      })
    }

    // Record the webhook call
    await recordWebhookCall(
      payload.operation,
      document._type,
      document._id,
      success,
      error
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Internal processing error' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      operation: payload.operation,
      documentType: document._type,
      documentId: document._id,
    })
  } catch (error) {
    logger.error('WebhookMain', 'Webhook processing error', error as Error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}, 'sanity-sync')

import { NextRequest, NextResponse } from 'next/server'
import { isValidSignature, SIGNATURE_HEADER_NAME } from '@sanity/webhook'
import { client } from '@/sanity/client'
import prisma from '@/lib/prisma'

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

    // console.log(`📊 Recent webhook calls: ${recentCalls}`)
    return recentCalls < rateLimit
  } catch (error) {
    console.error('Rate limit check failed:', error)
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
    console.log('📊 Webhook call recorded:', {
      operation,
      documentType,
      documentId,
      success,
      error,
    })
  } catch (err) {
    console.error('❌ Failed to record webhook call:', err)
    // 不抛出错误，避免影响主要的 webhook 处理流程
  }
}

async function getI18nInfo(documentId: string): Promise<{
  i18n_id: string
  i18n_lang: string | null
  related_document_ids: string[]
}> {
  if (!documentId) {
    console.warn('⚠️ getI18nInfo called with no documentId.')
    return { i18n_id: '', i18n_lang: null, related_document_ids: [] }
  }

  console.log(`🔍 Getting i18n info for document: ${documentId}`)

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
    console.log(`🔍 Executing GROQ query with timeout for ${documentId}...`)

    const queryPromise = client.fetch(query, params)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(new Error(`Query timeout for ${documentId} after 10 seconds`)),
        10000
      )
    )

    const result = await Promise.race([queryPromise, timeoutPromise])

    console.log(
      `📊 i18n query result for ${documentId}:`,
      JSON.stringify(result, null, 2)
    )

    const i18n_id = result?.i18n_metadata?.i18n_id || documentId
    const related_document_ids = result?.i18n_metadata
      ?.related_document_ids || [documentId]
    const i18n_lang = result?.i18n_lang || null

    console.log(
      `📋 Final i18n info: i18n_id=${i18n_id}, lang=${i18n_lang}, related_ids=${related_document_ids.join(
        ', '
      )}`
    )

    return {
      i18n_id,
      i18n_lang,
      related_document_ids,
    }
  } catch (error) {
    console.error(`❌ Error fetching i18n info for ${documentId}:`, error)
    console.log(`🔄 Falling back to document ID as i18n_id for ${documentId}`)

    try {
      console.log(
        `🔍 Attempting to get language info only for ${documentId}...`
      )
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
      console.log(`📋 Language fallback result: ${langResult}`)
      return {
        i18n_id: documentId,
        i18n_lang: langResult || null,
        related_document_ids: [documentId],
      }
    } catch (langError) {
      console.error(
        `❌ Language fallback also failed for ${documentId}:`,
        langError
      )
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
    console.log(
      `🔍 Consolidating log i18n records: i18n_id=${i18n_id}, related_ids=${related_document_ids.join(
        ', '
      )}, lang=${language}`
    )

    // 1. Find an existing post using either the i18n_id or any of the related document IDs
    let existingPost = await tx.post.findFirst({
      where: {
        sanityDocumentId: {
          in: [i18n_id, ...related_document_ids],
        },
      },
    })

    if (existingPost) {
      console.log(
        `📋 Found existing post ${existingPost.id} with sanityDocumentId ${existingPost.sanityDocumentId}`
      )

      // If the post is not using the main i18n_id, update it
      if (existingPost.sanityDocumentId !== i18n_id) {
        console.log(
          `🔄 Migrating post ${existingPost.id} from ${existingPost.sanityDocumentId} to ${i18n_id}`
        )
        existingPost = await tx.post.update({
          where: { id: existingPost.id },
          data: { sanityDocumentId: i18n_id },
        })
        console.log(`✅ Post updated to use i18n_id: ${existingPost.id}`)
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

      console.log(
        `Existing log for postId ${
          existingPost.id
        } and lang ${language}: ${!!existingLog}`
      )

      return {
        postId: existingPost.id,
        shouldCreateLog: !existingLog,
      }
    }

    // 2. No existing post found, create a new one with the main i18n_id
    console.log(
      `🆕 No existing post found. Creating new post with i18n_id: ${i18n_id}`
    )
    const newPost = await tx.post.create({
      data: {
        sanityDocumentId: i18n_id, // Use the translation group ID
        contentType: 'log',
        authorId: process.env.AUTHOR_USER_ID || 'default-author',
      },
    })

    console.log(`✅ New post created: ${newPost.id}`)

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
  const nameObj = payload.name as { en?: string; zh?: string } | string | undefined
  const descObj = payload.description as { en?: string; zh?: string } | string | undefined
  
  const nameEn = typeof nameObj === 'object' ? nameObj?.en || '' : payload.nameEn || ''
  const nameZh = typeof nameObj === 'object' ? nameObj?.zh || '' : payload.nameZh || ''
  const descriptionEn = typeof descObj === 'object' ? descObj?.en || null : payload.descriptionEn || null
  const descriptionZh = typeof descObj === 'object' ? descObj?.zh || null : payload.descriptionZh || null

  console.log('🆕 处理 Collection 创建操作', {
    id: payload._id,
    nameEn,
    nameZh,
    descriptionEn,
    descriptionZh,
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
      console.log('Collection already exists, skipping creation')
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

    console.log('✅ Collection created successfully')
  } catch (error) {
    console.error('❌ Error creating collection:', error)
    throw error
  }
}

async function handleCollectionUpdate(
  payload: SanityDocument & { i18n_id: string; i18n_lang: string | null }
) {
  // Extract i18n data from object-level structure
  const nameObj = payload.name as { en?: string; zh?: string } | string | undefined
  const descObj = payload.description as { en?: string; zh?: string } | string | undefined
  
  const nameEn = typeof nameObj === 'object' ? nameObj?.en || '' : payload.nameEn || ''
  const nameZh = typeof nameObj === 'object' ? nameObj?.zh || '' : payload.nameZh || ''
  const descriptionEn = typeof descObj === 'object' ? descObj?.en || null : payload.descriptionEn || null
  const descriptionZh = typeof descObj === 'object' ? descObj?.zh || null : payload.descriptionZh || null

  console.log('📝 处理 Collection 更新操作', {
    id: payload._id,
    nameEn,
    nameZh,
    descriptionEn,
    descriptionZh,
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

    console.log(`✅ Upserted collection: ${result.id} (${result.nameEn})`)
  } catch (error) {
    console.error('❌ Error upserting collection:', error)
    throw error
  }
}

async function handleCollectionDelete(
  payload: SanityDocument & { i18n_id: string; i18n_lang: string | null }
) {
  console.log('🗑️ 处理 Collection 删除操作', {
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

    console.log(`✅ Soft deleted ${updated.count} collection(s)`)
    await recordWebhookCall('delete', 'collection', payload._id, true)
  } catch (error) {
    console.error('❌ Error deleting collection:', error)
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
  const nameObj = payload.name as { en?: string; zh?: string } | string | undefined
  const descObj = payload.description as { en?: string; zh?: string } | string | undefined
  
  const nameEn = typeof nameObj === 'object' ? nameObj?.en || '' : payload.nameEn || ''
  const nameZh = typeof nameObj === 'object' ? nameObj?.zh || '' : payload.nameZh || ''
  const descriptionEn = typeof descObj === 'object' ? descObj?.en || null : payload.descriptionEn || null
  const descriptionZh = typeof descObj === 'object' ? descObj?.zh || null : payload.descriptionZh || null

  console.log('🆕 处理 DevCollection 创建操作', {
    id: payload._id,
    nameEn,
    nameZh,
    descriptionEn,
    descriptionZh,
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
      console.log('DevCollection already exists, skipping creation')
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

    console.log('✅ DevCollection created successfully')
  } catch (error) {
    console.error('❌ Error creating devCollection:', error)
    throw error
  }
}

async function handleDevCollectionUpdate(
  payload: SanityDocument & { i18n_id: string; i18n_lang: string | null }
) {
  // Extract i18n data from object-level structure
  const nameObj = payload.name as { en?: string; zh?: string } | string | undefined
  const descObj = payload.description as { en?: string; zh?: string } | string | undefined
  
  const nameEn = typeof nameObj === 'object' ? nameObj?.en || '' : payload.nameEn || ''
  const nameZh = typeof nameObj === 'object' ? nameObj?.zh || '' : payload.nameZh || ''
  const descriptionEn = typeof descObj === 'object' ? descObj?.en || null : payload.descriptionEn || null
  const descriptionZh = typeof descObj === 'object' ? descObj?.zh || null : payload.descriptionZh || null

  console.log('📝 处理 DevCollection 更新操作', {
    id: payload._id,
    nameEn,
    nameZh,
    descriptionEn,
    descriptionZh,
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

    console.log(`✅ Upserted devCollection: ${result.id} (${result.nameEn})`)
  } catch (error) {
    console.error('❌ Error upserting devCollection:', error)
    throw error
  }
}

async function handleDevCollectionDelete(
  payload: SanityDocument & { i18n_id: string; i18n_lang: string | null }
) {
  console.log('🗑️ 处理 DevCollection 删除操作', {
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

    console.log(`✅ Soft deleted ${updated.count} devCollection(s)`)
    await recordWebhookCall('delete', 'devCollection', payload._id, true)
  } catch (error) {
    console.error('❌ Error deleting devCollection:', error)
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
  console.log('🆕 处理 Log 创建操作', {
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
      console.log(
        'Log entry for this language already exists, skipping creation'
      )
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

    console.log('✅ Log created successfully')
  } catch (error) {
    console.error('❌ Error creating log:', error)
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
  console.log('📝 处理 Log 更新操作', {
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
      console.log('✅ Log created during update operation')
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
      console.log('✅ Log updated successfully')
    }
  } catch (error) {
    console.error('❌ Error updating log:', error)
    throw error
  }
}

async function handleLogDelete(
  payload: SanityDocument & { i18n_id: string; i18n_lang: string | null }
) {
  console.log('🗑️ 处理 Log 删除操作', {
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

    console.log(
      `✅ Soft deleted ${updated.count} log post(s) for document: ${documentId}`
    )
    await recordWebhookCall('delete', 'log', documentId, true)
  } catch (error) {
    console.error('❌ Error deleting log:', error)
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

  console.log('🆕 处理 Photo 创建操作', {
    id: payload._id,
    titleJson,
    descriptionJson,
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
      console.log('Photo already exists, skipping creation')
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

    console.log('✅ Photo created successfully')
  } catch (error) {
    console.error('❌ Error creating photo:', error)
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

  console.log('📝 处理 Photo 更新操作', {
    id: payload._id,
    titleJson,
    descriptionJson,
  })

  try {
    const documentId = payload._id

    // Find the post
    const post = await prisma.post.findUnique({
      where: { sanityDocumentId: documentId },
      include: { photo: true },
    })

    if (!post) {
      console.log('Post not found, creating new one')
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

    console.log('✅ Photo updated successfully')
  } catch (error) {
    console.error('❌ Error updating photo:', error)
    throw error
  }
}

async function handlePhotoDelete(
  payload: SanityDocument & { i18n_id: string; i18n_lang: string | null }
) {
  console.log('🗑️ 处理 Photo 删除操作', {
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

    console.log(
      `✅ Soft deleted ${updated.count} photo post(s) for document: ${documentId}`
    )
    await recordWebhookCall('delete', 'photo', documentId, true)
  } catch (error) {
    console.error('❌ Error deleting photo:', error)
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

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting check
    const withinRateLimit = await checkRateLimit()
    if (!withinRateLimit) {
      console.warn('🚫 Webhook rate limit exceeded')
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // 2. 验证签名
    const signature = request.headers.get(SIGNATURE_HEADER_NAME)
    const body = await request.text()

    if (!process.env.SANITY_WEBHOOK_SECRET) {
      console.error('🚨 SANITY_WEBHOOK_SECRET is not set')
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

    // 🔍 DEBUG: 完整记录payload结构
    console.log(
      '🔍 [DEBUG] ==================== WEBHOOK PAYLOAD ===================='
    )
    console.log('🔍 [DEBUG] 完整 Webhook Payload:')
    console.log(JSON.stringify(payload, null, 2))
    console.log(
      '🔍 [DEBUG] ==================== WEBHOOK PAYLOAD ===================='
    )

    // This is the crucial change
    const document =
      payload.operation === 'delete' ? payload.beforeState : payload.afterState

    if (!document) {
      console.error(
        'Webhook error: Document data is missing in payload',
        payload
      )
      return NextResponse.json(
        { error: 'Document data is missing in payload' },
        { status: 400 }
      )
    }

    console.log(
      `📥 Sanity ${payload.operation} webhook received for document:`,
      {
        type: document._type,
        id: document._id,
      }
    )

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

        default:
          console.warn(`Unhandled document type: ${document._type}`)
      }
    } catch (err) {
      success = false
      error = err instanceof Error ? err.message : 'Unknown error'
      console.error(
        `❌ Error handling ${payload.operation} for ${document._type}:`,
        err
      )
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
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

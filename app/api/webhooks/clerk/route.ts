// app/api/webhooks/clerk/route.ts

import { Webhook } from 'svix'
import { WebhookEvent } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withWebhookMonitoring } from '@/lib/sentry-api-integration'

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

    logger.info('ClerkWebhookRecord', 'Webhook调用记录已保存', {
      operation,
      documentType,
      documentId,
      success,
      error,
    })
  } catch (err) {
    logger.error('ClerkWebhookRecord', '保存Webhook调用记录失败', err as Error, {
      operation,
      documentType,
      documentId,
      success,
      error,
    })
    // 不抛出错误，避免影响主要的 webhook 处理流程
  }
}

export const POST = withWebhookMonitoring(async (req: NextRequest) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    logger.error('ClerkWebhook', '缺少CLERK_WEBHOOK_SECRET环境变量')
    throw new Error(
      'Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local'
    )
  }

  // 直接从传入的 `req` 对象中获取请求头
  const headerPayload = req.headers
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    logger.error('ClerkWebhook', '缺少svix headers')
    return NextResponse.json({ error: 'Error occured -- no svix headers' }, { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    logger.error('ClerkWebhook', 'Webhook验证失败', err as Error)
    return NextResponse.json({ error: 'Error occured' }, { status: 400 })
  }

  const eventType = evt.type

  // 处理用户创建事件
  if (eventType === 'user.created') {
    const { id, email_addresses, image_url, username, first_name, last_name } =
      evt.data

    let success = true
    let error: string | undefined

    try {
      // 优先使用 username，如果没有则使用 first_name + last_name，最后使用匿名用户作为兜底
      let displayName = username
      if (!displayName) {
        const fullName = `${first_name || ''} ${last_name || ''}`.trim()
        displayName = fullName || '匿名用户' // 默认中文匿名用户
      }

      // 将用户数据写入到我们自己的数据库
      await prisma.user.create({
        data: {
          id: id,
          email: email_addresses[0].email_address,
          name: displayName,
          avatarUrl: image_url,
        },
      })

      // 通过 Clerk 后端 API，为新用户设置默认角色
      const client = await clerkClient()
      await client.users.updateUserMetadata(id, {
        publicMetadata: {
          role: 'user',
        },
      })

      logger.info('ClerkWebhook', '用户创建成功', {
        userId: id,
        name: displayName,
      })
    } catch (err) {
      success = false
      error = err instanceof Error ? err.message : 'Unknown error'
      logger.error('ClerkWebhook', '用户创建失败', err as Error, { userId: id })
    }

    // 记录 webhook 调用
    await recordWebhookCall('user.created', 'user', id, success, error)

    if (!success) {
      return NextResponse.json({ error: 'User creation failed' }, { status: 500 })
    }

    return NextResponse.json({ message: 'User created' }, { status: 201 })
  }

  // 处理用户更新事件
  if (eventType === 'user.updated') {
    const { id, email_addresses, image_url, username, first_name, last_name } =
      evt.data

    let success = true
    let error: string | undefined

    try {
      // 优先使用 username，如果没有则使用 first_name + last_name，最后使用匿名用户作为兜底
      let displayName = username
      if (!displayName) {
        const fullName = `${first_name || ''} ${last_name || ''}`.trim()
        displayName = fullName || '匿名用户' // 默认中文匿名用户
      }

      // 使用 upsert 操作，如果用户不存在则创建，存在则更新
      await prisma.user.upsert({
        where: { id: id },
        update: {
          email: email_addresses[0].email_address,
          name: displayName,
          avatarUrl: image_url,
        },
        create: {
          id: id,
          email: email_addresses[0].email_address,
          name: displayName,
          avatarUrl: image_url,
        },
      })

      logger.info('ClerkWebhook', '用户更新成功', {
        userId: id,
        name: displayName,
      })
    } catch (err) {
      success = false
      error = err instanceof Error ? err.message : 'Unknown error'
      logger.error('ClerkWebhook', '用户更新失败', err as Error, { userId: id })
    }

    // 记录 webhook 调用
    await recordWebhookCall('user.updated', 'user', id, success, error)

    if (!success) {
      return NextResponse.json({ error: 'User update failed' }, { status: 500 })
    }

    return NextResponse.json({ message: 'User updated' }, { status: 200 })
  }

  // 处理用户删除事件
  if (eventType === 'user.deleted') {
    const { id } = evt.data
    if (!id) {
      await recordWebhookCall('user.deleted', 'user', 'unknown', false, 'User ID not found')
      return NextResponse.json({ error: 'Error occured -- user id not found' }, { status: 400 })
    }

    let success = true
    let error: string | undefined

    try {
      await prisma.user.delete({
        where: { id: id },
      })
      logger.info('ClerkWebhook', '用户删除成功', { userId: id })
    } catch (err) {
      success = false
      error = err instanceof Error ? err.message : 'Unknown error'
      logger.error('ClerkWebhook', '用户删除失败', err as Error, { userId: id })
    }

    // 记录 webhook 调用
    await recordWebhookCall('user.deleted', 'user', id, success, error)

    if (!success) {
      return NextResponse.json({ error: 'User deletion failed' }, { status: 500 })
    }

    return NextResponse.json({ message: 'User deleted' }, { status: 200 })
  }

  // 处理其他事件类型
  logger.info('ClerkWebhook', '未处理的事件类型', { eventType })
  await recordWebhookCall(eventType, 'unknown', 'unknown', true, 'Unhandled event type')
  return NextResponse.json({}, { status: 200 })
}, 'clerk-webhook')

// app/api/webhooks/clerk/route.ts

import { Webhook } from 'svix'
import { WebhookEvent } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
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
    return new Response('Error occured -- no svix headers', { status: 400 })
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
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', { status: 400 })
  }

  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, image_url, username, first_name, last_name } = evt.data

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

    return NextResponse.json({ message: 'User created' }, { status: 201 })
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, image_url, username, first_name, last_name } = evt.data
    
    // 优先使用 username，如果没有则使用 first_name + last_name，最后使用匿名用户作为兜底
    let displayName = username
    if (!displayName) {
      const fullName = `${first_name || ''} ${last_name || ''}`.trim()
      displayName = fullName || '匿名用户' // 默认中文匿名用户
    }
    
    await prisma.user.update({
      where: { id: id },
      data: {
        email: email_addresses[0].email_address,
        name: displayName,
        avatarUrl: image_url,
      },
    })
    return NextResponse.json({ message: 'User updated' }, { status: 200 })
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data
    if (!id) {
      return new Response('Error occured -- user id not found', { status: 400 })
    }
    await prisma.user.delete({
      where: { id: id },
    })
    return NextResponse.json({ message: 'User deleted' }, { status: 200 })
  }

  return new Response('', { status: 200 })
}

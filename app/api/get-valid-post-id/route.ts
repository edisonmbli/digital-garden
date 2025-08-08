import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    // 获取第一个可用的 Post ID
    const firstPost = await prisma.post.findFirst({
      select: { id: true, sanityDocumentId: true }
    })
    
    if (!firstPost) {
      return NextResponse.json({
        success: false,
        error: '数据库中没有找到任何 Post 记录'
      })
    }
    
    return NextResponse.json({
      success: true,
      data: {
        postId: firstPost.id,
        sanityDocumentId: firstPost.sanityDocumentId
      }
    })
  } catch (error) {
    logger.error('API', '获取 Post ID 失败', error as Error)
    return NextResponse.json(
      { success: false, error: '查询失败' },
      { status: 500 }
    )
  }
}
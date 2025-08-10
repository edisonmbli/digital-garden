import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { logger } from '@/lib/logger'

interface BatchLogRequest {
  logs: Array<{
    type: 'image' | 'content'
    action: 'view' | 'download' | 'copy'
    timestamp?: string
    userAgent?: string
    referer?: string
    // 通用字段
    userId?: string
    // 图片相关字段
    postId?: string
    collectionId?: string
    hasWatermark?: boolean
    // 内容相关字段
    url?: string
    developCollectionId?: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    const body: BatchLogRequest = await request.json()
    
    if (!body.logs || !Array.isArray(body.logs)) {
      return NextResponse.json(
        { error: 'Invalid request: logs array is required' },
        { status: 400 }
      )
    }

    // 限制批量大小，防止滥用
    if (body.logs.length > 100) {
      return NextResponse.json(
        { error: 'Batch size too large: maximum 100 logs per request' },
        { status: 400 }
      )
    }

    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const referer = request.headers.get('referer') || 'Unknown'
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'Unknown'

    // 批量处理日志
    const processedLogs = body.logs.map((log, index) => {
      const logUserId = log.userId || userId || 'anonymous'
      
      // 构建日志上下文
      const context: Record<string, string | number | boolean> = {
        type: log.type,
        action: log.action,
        userAgent,
        referer,
        clientIP,
        batchIndex: index,
        batchSize: body.logs.length,
        timestamp: log.timestamp || new Date().toISOString(),
      }

      // 添加类型特定的字段
      if (log.type === 'image') {
        if (log.postId) context.postId = log.postId
        if (log.collectionId) context.collectionId = log.collectionId
        if (typeof log.hasWatermark === 'boolean') context.hasWatermark = log.hasWatermark
      } else if (log.type === 'content') {
        if (log.url) context.url = log.url
        if (log.developCollectionId) context.developCollectionId = log.developCollectionId
      }

      return {
        userId: logUserId,
        context,
        message: `Batch ${log.type} ${log.action}`
      }
    })

    // 记录批量日志
    logger.info(
      'ClientAccess',
      `Batch access log received: ${body.logs.length} entries`,
      {
        batchSize: body.logs.length,
        userAgent,
        referer,
        clientIP,
        userId: userId || 'anonymous',
        logs: processedLogs
      }
    )

    // 为每个日志单独记录（便于后续分析）
    processedLogs.forEach(({ userId: logUserId, context, message }) => {
      logger.info('ClientAccess', message, context, undefined, logUserId)
    })

    return NextResponse.json({ 
      success: true, 
      processed: body.logs.length,
      message: 'Batch logs processed successfully'
    })

  } catch (error) {
    logger.error(
      'ClientAccess',
      'Failed to process batch access logs',
      error instanceof Error ? error : new Error(String(error)),
      {
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
      }
    )

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
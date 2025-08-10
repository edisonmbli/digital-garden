// app/api/log-access/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

interface AccessLogData {
  type: 'image' | 'content'
  action: 'view' | 'download' | 'copy'
  timestamp: string
  userAgent?: string
  referer?: string
  ip?: string
  // 通用字段
  userId?: string
  // 图片相关字段
  postId?: string
  collectionId?: string
  hasWatermark?: boolean
  // 内容相关字段
  url?: string // 仅 content 类型保留
  developCollectionId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AccessLogData
    const headersList = await headers()
    
    // 获取客户端信息
    const userAgent = headersList.get('user-agent') || 'Unknown'
    const referer = headersList.get('referer') || 'Direct'
    const ip = headersList.get('x-forwarded-for') || 
               headersList.get('x-real-ip') || 
               'Unknown'

    // 构建日志数据
    const logData = {
      ...body,
      timestamp: new Date().toISOString(),
      userAgent,
      referer,
      ip,
    }

    // 在生产环境中，这里可以发送到专业的日志服务
    // 例如：Vercel Analytics, LogRocket, Sentry 等
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({
        ...logData,
        service: 'digital-garden-ai',
        level: 'info',
      }))
      
      // 可以在这里添加发送到外部日志服务的逻辑
      // await sendToLogService(logData)
    } else {
      // 开发环境下的结构化日志输出
      const logType = body.type.toUpperCase()
      const action = body.action.toUpperCase()
      
      if (body.type === 'image') {
        console.log(`[${logType}] ${action} - PostID: ${body.postId || 'N/A'}, CollectionID: ${body.collectionId || 'N/A'}, Watermark: ${body.hasWatermark ? 'Yes' : 'No'}, User: ${body.userId || 'Anonymous'}`)
      } else {
        console.log(`[${logType}] ${action} - URL: ${body.url || 'N/A'}, PostID: ${body.postId || 'N/A'}, DevCollectionID: ${body.developCollectionId || 'N/A'}, User: ${body.userId || 'Anonymous'}`)
      }
      
      // 详细日志（可选）
      if (process.env.DEBUG_ACCESS_LOG === 'true') {
        console.log('Full Access Log:', logData)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to log access:', error)
    return NextResponse.json(
      { error: 'Failed to log access' },
      { status: 500 }
    )
  }
}

// 健康检查端点
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'access-logger',
    timestamp: new Date().toISOString() 
  })
}
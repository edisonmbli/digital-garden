import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { withApiMonitoring } from '@/lib/sentry-api-integration'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

interface AnalyticsEvent {
  eventName: string
  timestamp: string
  sessionId: string
  userId?: string
  page: string
  referrer?: string
  userAgent: string
  properties?: Record<string, unknown>
  performance?: {
    loadTime?: number
    fcp?: number
    lcp?: number
    cls?: number
    fid?: number
    ttfb?: number
  }
}

export const POST = withApiMonitoring(async (request: NextRequest) => {
  try {
    const { userId } = await auth()
    const events: AnalyticsEvent[] = await request.json()
    
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'Invalid events data' }, { status: 400 })
    }

    // 获取环境信息
    const environment = process.env.NODE_ENV || 'production'
    const serverTimestamp = Date.now()

    // 处理每个事件
    const processedEvents = events.map((event) => {
      // 客户端时间戳转换为服务器时区时间
      const clientTimestamp = new Date(event.timestamp)
      // 获取客户端时区偏移（如果有的话），否则使用服务器时区
      const timezoneOffset = event.properties?.timezoneOffset as number || new Date().getTimezoneOffset()
      
      // 调整时间戳到正确的时区
      const adjustedTimestamp = new Date(clientTimestamp.getTime() - (timezoneOffset * 60 * 1000))
      
      return {
        eventName: event.eventName,
        timestamp: adjustedTimestamp,
        date: new Date(adjustedTimestamp.toDateString()), // 提取日期部分
        sessionId: event.sessionId,
        userId: event.userId || userId || null,
        page: event.page,
        referrer: event.referrer || null,
        userAgent: event.userAgent,
        ip: request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown',
        country: request.headers.get('cf-ipcountry') || 'unknown',
        properties: event.properties ? event.properties as Prisma.InputJsonValue : Prisma.JsonNull,
        performance: event.performance ? event.performance as Prisma.InputJsonValue : Prisma.JsonNull,
        serverTimestamp: BigInt(serverTimestamp),
        environment
      }
    })

    // 批量插入数据库
    await prisma.analyticsEvent.createMany({
      data: processedEvents,
      skipDuplicates: true // 避免重复插入
    })

    // 在开发环境下打印事件信息
    if (environment === 'development') {
      console.log(`📊 Analytics: Logged ${processedEvents.length} events to database`)
      processedEvents.forEach(event => {
        console.log(`  - ${event.eventName}: ${event.page} (${event.sessionId.slice(0, 8)})`)
      })
    }

    return NextResponse.json({ 
      success: true, 
      processed: processedEvents.length,
      timestamp: serverTimestamp
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}, 'analytics')

// 支持OPTIONS请求（CORS预检）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
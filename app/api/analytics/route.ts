import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { auth } from '@clerk/nextjs/server'

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

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    const events: AnalyticsEvent[] = await request.json()
    
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'Invalid events data' }, { status: 400 })
    }

    // 确保日志目录存在
    const logsDir = join(process.cwd(), 'logs', 'analytics')
    if (!existsSync(logsDir)) {
      await mkdir(logsDir, { recursive: true })
    }

    // 按日期分文件存储
    const today = new Date().toISOString().split('T')[0]
    const logFile = join(logsDir, `analytics-${today}.jsonl`)

    // 处理每个事件
    const processedEvents = events.map((event) => ({
      ...event,
      userId: event.userId || userId || 'anonymous',
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'unknown',
      country: request.headers.get('cf-ipcountry') || 'unknown',
      processedAt: new Date().toISOString(),
      serverTimestamp: Date.now()
    }))

    // 写入JSONL格式
    const logLines = processedEvents.map((event) => JSON.stringify(event)).join('\n') + '\n'
    await writeFile(logFile, logLines, { flag: 'a' })

    // 在开发环境下打印事件信息
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Analytics: Logged ${processedEvents.length} events`)
      processedEvents.forEach(event => {
        console.log(`  - ${event.eventName}: ${event.page} (${event.sessionId.slice(0, 8)})`)
      })
    }

    return NextResponse.json({ 
      success: true, 
      processed: processedEvents.length,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

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
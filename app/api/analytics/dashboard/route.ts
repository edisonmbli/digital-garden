import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface AnalyticsEvent {
  eventType?: string // 旧格式
  eventName?: string // 新格式
  timestamp: number | string
  sessionId: string
  data?: Record<string, unknown> // 旧格式
  properties?: Record<string, unknown> // 新格式
  userId: string
  ip: string
  country: string
  processedAt: string
  serverTimestamp: number
  page?: string
  referrer?: string
  userAgent?: string
}

interface EventSummary {
  eventType: string
  count: number
  lastSeen: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    const logsDir = path.join(process.cwd(), 'logs', 'analytics')
    
    // 检查日志目录是否存在
    try {
      await fs.access(logsDir)
    } catch {
      return NextResponse.json({
        events: [],
        summary: [],
        message: 'Analytics日志目录不存在'
      })
    }

    // 读取所有日志文件
    const files = await fs.readdir(logsDir)
    let jsonlFiles = files.filter(file => file.endsWith('.jsonl'))
    
    // 如果指定了日期范围，过滤文件
    if (startDate || endDate) {
      jsonlFiles = jsonlFiles.filter(file => {
        const match = file.match(/analytics-(\d{4}-\d{2}-\d{2})\.jsonl/)
        if (!match) return false
        
        const fileDate = match[1]
        
        if (startDate && fileDate < startDate) return false
        if (endDate && fileDate > endDate) return false
        
        return true
      })
    }
    
    if (jsonlFiles.length === 0) {
      return NextResponse.json({
        events: [],
        summary: [],
        message: '暂无Analytics日志文件'
      })
    }

    const allEvents: AnalyticsEvent[] = []

    // 读取所有日志文件内容
    for (const file of jsonlFiles) {
      const filePath = path.join(logsDir, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const lines = content.trim().split('\n').filter(line => line.trim())
      
      for (const line of lines) {
        try {
          const rawEvent = JSON.parse(line) as AnalyticsEvent
          // 统一事件格式
          const event: AnalyticsEvent = {
            ...rawEvent,
            eventType: rawEvent.eventType || rawEvent.eventName || 'unknown',
            data: rawEvent.data || rawEvent.properties || {}
          }
          allEvents.push(event)
        } catch (parseError) {
          console.error('解析Analytics事件失败:', parseError)
        }
      }
    }

    // 按时间戳降序排序
    allEvents.sort((a, b) => b.serverTimestamp - a.serverTimestamp)

    // 生成事件汇总
    const eventCounts = new Map<string, { count: number; lastSeen: number }>()
    
    for (const event of allEvents) {
      const eventType = event.eventType || 'unknown'
      const existing = eventCounts.get(eventType)
      if (existing) {
        existing.count++
        existing.lastSeen = Math.max(existing.lastSeen, event.serverTimestamp)
      } else {
        eventCounts.set(eventType, {
          count: 1,
          lastSeen: event.serverTimestamp
        })
      }
    }

    const summary: EventSummary[] = Array.from(eventCounts.entries())
      .map(([eventType, data]) => ({
        eventType,
        count: data.count,
        lastSeen: new Date(data.lastSeen).toLocaleString('zh-CN')
      }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      events: allEvents,
      summary,
      totalEvents: allEvents.length,
      totalSessions: new Set(allEvents.map(e => e.sessionId)).size,
      dateRange: allEvents.length > 0 ? {
        earliest: new Date(Math.min(...allEvents.map(e => e.serverTimestamp))).toLocaleString('zh-CN'),
        latest: new Date(Math.max(...allEvents.map(e => e.serverTimestamp))).toLocaleString('zh-CN')
      } : null
    })

  } catch (error) {
    console.error('读取Analytics数据失败:', error)
    return NextResponse.json(
      { 
        error: '读取Analytics数据失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}
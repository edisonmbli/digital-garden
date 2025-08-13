import { NextRequest, NextResponse } from 'next/server'
import { withApiMonitoring } from '@/lib/sentry-api-integration'
import prisma from '@/lib/prisma'
import type { AnalyticsEvent } from '@prisma/client'

interface EventSummary {
  eventType: string
  count: number
  lastSeen: string
}

export const GET = withApiMonitoring(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const environment = process.env.NODE_ENV || 'production'
    
    // 构建查询条件
    const whereClause: { environment: string; date?: { gte?: Date; lte?: Date } } = {
      environment
    }
    
    // 如果指定了日期范围，添加日期过滤
    if (startDate || endDate) {
      whereClause.date = {}
      if (startDate) {
        whereClause.date.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate)
      }
    }
    
    // 从数据库查询事件
    const allEvents = await prisma.analyticsEvent.findMany({
      where: whereClause,
      orderBy: {
        serverTimestamp: 'desc'
      },
      take: 1000 // 限制返回数量，避免性能问题
    })
    
    if (allEvents.length === 0) {
      return NextResponse.json({
        events: [],
        summary: [],
        message: '暂无Analytics数据'
      })
    }

    // 转换数据格式以保持兼容性
    const formattedEvents = allEvents.map((event: AnalyticsEvent) => ({
      eventType: event.eventName,
      eventName: event.eventName,
      timestamp: event.timestamp.toISOString(),
      sessionId: event.sessionId,
      userId: event.userId || 'anonymous',
      ip: event.ip,
      country: event.country,
      processedAt: event.processedAt.toISOString(),
      serverTimestamp: Number(event.serverTimestamp),
      page: event.page,
      referrer: event.referrer,
      userAgent: event.userAgent,
      properties: event.properties,
      performance: event.performance
    }))

    // 生成事件汇总
    const eventCounts = new Map<string, { count: number; lastSeen: number }>()
    
    for (const event of formattedEvents) {
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
      events: formattedEvents,
      summary,
      totalEvents: formattedEvents.length,
      totalSessions: new Set(formattedEvents.map(e => e.sessionId)).size,
      dateRange: formattedEvents.length > 0 ? {
        earliest: new Date(Math.min(...formattedEvents.map(e => e.serverTimestamp))).toLocaleString('zh-CN'),
        latest: new Date(Math.max(...formattedEvents.map(e => e.serverTimestamp))).toLocaleString('zh-CN')
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
}, 'analytics-dashboard')
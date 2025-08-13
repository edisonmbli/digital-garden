import { NextRequest, NextResponse } from 'next/server'
import { withApiMonitoring } from '@/lib/sentry-api-integration'
import prisma from '@/lib/prisma'

// 数据保留天数配置
const DATA_RETENTION_DAYS = parseInt(process.env.ANALYTICS_RETENTION_DAYS || '180')

export const POST = withApiMonitoring(async (request: NextRequest) => {
  try {
    // Vercel CRON 认证检查
    const authHeader = request.headers.get('authorization')
    
    // 在生产环境中，Vercel会自动添加Authorization header
    if (process.env.NODE_ENV === 'production' && !authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const environment = process.env.NODE_ENV || 'production'
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - DATA_RETENTION_DAYS)

    // 删除过期的 analytics 数据
    const deleteResult = await prisma.analyticsEvent.deleteMany({
      where: {
        environment,
        date: {
          lt: cutoffDate
        }
      }
    })

    const message = `Cleaned up ${deleteResult.count} analytics records older than ${DATA_RETENTION_DAYS} days`
    
    // 记录清理日志
    console.log(`[Analytics Cleanup] ${message}`, {
      environment,
      cutoffDate: cutoffDate.toISOString(),
      deletedCount: deleteResult.count,
      retentionDays: DATA_RETENTION_DAYS
    })

    return NextResponse.json({
      success: true,
      message,
      deletedCount: deleteResult.count,
      cutoffDate: cutoffDate.toISOString(),
      retentionDays: DATA_RETENTION_DAYS
    })

  } catch (error) {
    console.error('Analytics cleanup failed:', error)
    return NextResponse.json(
      { 
        error: 'Analytics cleanup failed',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}, 'analytics-cleanup')

// 手动触发清理（仅开发环境）
export const GET = withApiMonitoring(async (request: NextRequest) => {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
  }

  // 重用 POST 逻辑，但跳过认证
  const mockRequest = new Request(request.url, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${process.env.CRON_SECRET || 'dev-secret'}`
    }
  })

  return POST(mockRequest as NextRequest)
}, 'analytics-cleanup-dev')
import { NextRequest, NextResponse } from 'next/server'
import { withApiMonitoring } from '@/lib/sentry-api-integration'
import { performImageWarmup } from '@/lib/warmup-utils'

// 定时缓存预热任务
export const POST = withApiMonitoring(async (request: NextRequest) => {
  try {
    // Vercel CRON 认证检查
    const authHeader = request.headers.get('authorization')
    
    // 在生产环境中，Vercel会自动添加Authorization header
    if (process.env.NODE_ENV === 'production' && !authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const startTime = Date.now()
    
    // 记录预热开始
    console.log('[Warmup Cron] Starting scheduled cache warmup', {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      trigger: 'cron'
    })

    // 获取当前部署的 URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL || 'https://edisonmbli.com'

    // 执行预热逻辑
    const warmupResult = await performImageWarmup(baseUrl, 'all', 50, 3)
    
    const duration = Date.now() - startTime
    
    // 记录预热结果
    console.log('[Warmup Cron] Scheduled warmup completed', {
      duration,
      result: warmupResult,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Scheduled warmup completed',
      duration,
      result: warmupResult,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Warmup Cron] Scheduled warmup failed:', error)
    return NextResponse.json(
      { 
        error: 'Scheduled warmup failed',
        details: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}, 'warmup-cron')

// 手动触发定时任务（仅开发环境）
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
}, 'warmup-cron-dev')
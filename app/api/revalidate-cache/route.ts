import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { withApiMonitoring } from '@/lib/sentry-api-integration'

// Sanity Webhook 密钥验证
const WEBHOOK_SECRET = process.env.SANITY_WEBHOOK_SECRET
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID

// Cloudflare 缓存清理函数
async function purgeCloudflareCache(urls: string[]) {
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ZONE_ID) {
    console.warn('Cloudflare credentials not configured, skipping cache purge')
    return { success: false, reason: 'credentials_missing' }
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: urls }),
      }
    )

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${response.status} - ${JSON.stringify(result)}`)
    }

    console.log('Cloudflare cache purged successfully:', {
      urls: urls.length,
      success: result.success
    })
    
    return { success: true, result }
  } catch (error) {
    console.error('Failed to purge Cloudflare cache:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// 生成需要清理的 URL 列表
function generatePurgeUrls(body: {
  _type?: string;
  slug?: { current?: string };
  _id?: string;
}): string[] {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'
  const urls: string[] = []
  
  // 总是清理首页
  urls.push(`${baseUrl}/`)
  urls.push(`${baseUrl}/zh`)
  urls.push(`${baseUrl}/en`)
  
  // 如果有 slug，清理具体页面
  if (body.slug?.current) {
    urls.push(`${baseUrl}/${body.slug.current}`)
    urls.push(`${baseUrl}/zh/${body.slug.current}`)
    urls.push(`${baseUrl}/en/${body.slug.current}`)
  }
  
  // 清理图片缓存（通配符模式）
  urls.push(`${baseUrl}/_next/image*`)
  
  // 根据内容类型清理相关页面
  if (body._type === 'post') {
    urls.push(`${baseUrl}/posts`)
    urls.push(`${baseUrl}/zh/posts`)
    urls.push(`${baseUrl}/en/posts`)
  }
  
  return urls
}

export const POST = withApiMonitoring(async (request: NextRequest) => {
  try {
    // 验证 Webhook 密钥
    const signature = request.headers.get('sanity-webhook-signature')
    const authHeader = request.headers.get('authorization')
    
    // 支持两种认证方式：header signature 或 query secret
    const querySecret = request.nextUrl.searchParams.get('secret')
    
    const isValidSignature = signature && signature === WEBHOOK_SECRET
    const isValidSecret = querySecret && querySecret === WEBHOOK_SECRET
    const isValidAuth = authHeader && authHeader === `Bearer ${WEBHOOK_SECRET}`
    
    if (!WEBHOOK_SECRET || (!isValidSignature && !isValidSecret && !isValidAuth)) {
      console.warn('Unauthorized cache revalidation attempt:', {
        hasSignature: !!signature,
        hasSecret: !!querySecret,
        hasAuth: !!authHeader,
        userAgent: request.headers.get('user-agent') || 'unknown'
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { _type, slug, _id } = body
    
    console.log('Cache revalidation triggered:', {
      type: _type,
      slug: slug?.current,
      id: _id,
      timestamp: new Date().toISOString()
    })

    // 清理 Next.js 缓存
    const revalidationResults = {
      paths: [] as string[],
      tags: [] as string[]
    }
    
    // 清理具体路径
    if (slug?.current) {
      const paths = [`/${slug.current}`, `/zh/${slug.current}`, `/en/${slug.current}`]
      paths.forEach(path => {
        revalidatePath(path)
        revalidationResults.paths.push(path)
      })
    }
    
    // 清理首页
    revalidatePath('/')
    revalidatePath('/zh')
    revalidatePath('/en')
    revalidationResults.paths.push('/', '/zh', '/en')
    
    // 清理特定标签
    const tags = [_type, 'posts', 'sanity-content']
    tags.forEach(tag => {
      if (tag) {
        revalidateTag(tag)
        revalidationResults.tags.push(tag)
      }
    })

    // 清理 Cloudflare 缓存
    const purgeUrls = generatePurgeUrls(body)
    const cloudflareResult = await purgeCloudflareCache(purgeUrls)

    const response = {
      message: 'Cache invalidated successfully',
      revalidated: true,
      timestamp: new Date().toISOString(),
      details: {
        nextjs: revalidationResults,
        cloudflare: {
          attempted: true,
          success: cloudflareResult.success,
          urls: purgeUrls.length,
          ...(cloudflareResult.error && { error: cloudflareResult.error })
        },
        content: {
          type: _type,
          slug: slug?.current,
          id: _id
        }
      }
    }
    
    console.log('Cache revalidation completed:', response.details)
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Cache revalidation error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}, 'cache-revalidation')

// 开发环境手动触发（GET 请求）
export const GET = withApiMonitoring(async (request: NextRequest) => {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
  }

  // 模拟 webhook 数据进行测试
  const mockBody = {
    _type: 'post',
    _id: 'test-id',
    slug: { current: 'test-post' }
  }

  // 重用 POST 逻辑
  const mockRequest = new Request(request.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'sanity-webhook-signature': WEBHOOK_SECRET || 'dev-secret'
    },
    body: JSON.stringify(mockBody)
  })

  return POST(mockRequest as NextRequest)
}, 'cache-revalidation-dev')
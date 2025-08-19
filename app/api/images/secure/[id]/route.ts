// app/api/images/secure/[id]/route.ts
// 安全图片端点 - 双层代理架构的第一层
// 
// 架构说明：
// 1. 此端点仅返回原始图片数据，不进行优化处理
// 2. 由 Next.js Image 组件通过 /_next/image 调用此端点
// 3. Next.js 负责图片优化、格式转换和缓存
// 4. 保持 Sanity 配置隐藏的同时享受 Next.js 优化收益

import { NextRequest, NextResponse } from 'next/server'
import {
  validateAndSanitizeImageParams,
  fetchSecureImageData,
  generateSecureHeaders,
  generateImageETag,
  type ImageParams
} from '@/lib/image-security-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    
    // 解析查询参数
    const imageParams: ImageParams = {
      id,
      width: searchParams.get('w') ? parseInt(searchParams.get('w')!) : undefined,
      height: searchParams.get('h') ? parseInt(searchParams.get('h')!) : undefined,
      quality: searchParams.get('q') ? parseInt(searchParams.get('q')!) : undefined,
      format: searchParams.get('fm') || undefined
    }
    
    // 验证和清理参数
    const validation = await validateAndSanitizeImageParams(imageParams)
    if (!validation.isValid) {
      return new NextResponse(validation.error, { status: 400 })
    }
    
    const sanitizedParams = validation.sanitizedParams!
    
    // 生成 ETag 用于缓存验证
    const etag = generateImageETag(sanitizedParams.id, {
      width: sanitizedParams.width,
      height: sanitizedParams.height,
      quality: sanitizedParams.quality,
      format: sanitizedParams.format
    })
    
    // 检查 If-None-Match 头，支持 304 Not Modified
    const ifNoneMatch = request.headers.get('if-none-match')
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 })
    }
    
    // 获取图片数据
    const response = await fetchSecureImageData(sanitizedParams)
    
    // 获取图片内容
    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || `image/${sanitizedParams.format}`
    
    // 生成安全响应头
    const headers = generateSecureHeaders(contentType)
    
    // 添加 ETag
    headers.set('ETag', etag)
    
    // 添加内容长度（如果可用）
    const contentLength = response.headers.get('content-length')
    if (contentLength) {
      headers.set('Content-Length', contentLength)
    }
    
    // 添加 Vary 头支持内容协商
    headers.set('Vary', 'Accept, Accept-Encoding')
    
    // 添加安全端点标识
    headers.set('X-Image-Proxy', 'secure-v2')
    
    return new NextResponse(imageBuffer, {
      status: 200,
      headers,
    })
    
  } catch (error) {
    // 根据错误类型返回适当的状态码
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        return new NextResponse('Image not found', { status: 404 })
      }
      if (error.message.includes('403') || error.message.includes('Access denied')) {
        return new NextResponse('Access denied', { status: 403 })
      }
    }
    
    return new NextResponse('Internal server error', { status: 500 })
  }
}

// 配置运行时
export const runtime = 'nodejs'
// 注意：这里使用 force-dynamic 确保每次请求都执行
// 图片数据需要动态获取，不能静态化
export const dynamic = 'force-dynamic'
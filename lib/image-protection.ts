// lib/image-protection.ts
import { NextRequest, NextResponse } from 'next/server'

/**
 * 图片防盗链检查
 * 检查请求的 Referer 头，确保图片只能从允许的域名访问
 */
export function checkImageReferer(request: NextRequest): boolean {
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')
  
  // 允许的域名列表
  const allowedDomains = [
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, ''),
    host,
    'localhost:3000',
    'localhost:3001',
    // 添加 Vercel 预览域名模式
    /.*\.vercel\.app$/,
    // 添加 Sanity CDN 域名（用于图片预览）
    'cdn.sanity.io',
  ].filter(Boolean)

  // 如果没有 referer（直接访问），允许通过（避免过于严格）
  if (!referer) {
    return true
  }

  try {
    const refererUrl = new URL(referer)
    const refererHost = refererUrl.hostname

    // 检查是否在允许列表中
    return allowedDomains.some(domain => {
      if (typeof domain === 'string') {
        return refererHost === domain || refererHost.endsWith(`.${domain}`)
      } else if (domain instanceof RegExp) {
        return domain.test(refererHost)
      }
      return false
    })
  } catch {
    // 如果 referer 不是有效 URL，拒绝访问
    return false
  }
}

/**
 * 记录图片访问日志
 * 用于监控和分析图片访问模式
 */
export function logImageAccess(request: NextRequest, allowed: boolean) {
  const userAgent = request.headers.get('user-agent') || 'Unknown'
  const referer = request.headers.get('referer') || 'Direct'
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown'
  
  // 在生产环境中，这里可以发送到日志服务
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'image_access',
      url: request.url,
      allowed,
      ip,
      userAgent,
      referer,
    }))
  }
}

/**
 * 生成防盗链响应
 * 当检测到盗链时返回的响应
 */
export function createHotlinkProtectionResponse(): NextResponse {
  // 可以返回一个水印图片或者 403 错误
  return new NextResponse('Hotlinking not allowed', {
    status: 403,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}

/**
 * 检查是否为图片请求
 */
export function isImageRequest(pathname: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico']
  return imageExtensions.some(ext => pathname.toLowerCase().endsWith(ext))
}

/**
 * 检查是否为 Sanity CDN 图片
 */
export function isSanityImage(pathname: string): boolean {
  return pathname.includes('cdn.sanity.io') || pathname.includes('_next/image')
}
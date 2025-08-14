// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { i18n } from './i18n-config'
import { match as matchLocale } from '@formatjs/intl-localematcher'
import Negotiator from 'negotiator'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { logger } from './lib/logger'
import { 
  isImageRequest, 
  isSanityImage, 
  checkImageReferer, 
  logImageAccess, 
  createHotlinkProtectionResponse 
} from './lib/image-protection'

/**
 * @description 获取请求中最匹配的地域语言。
 * @param request - Next.js 的请求对象。
 * @returns 匹配到的语言代码，如 'en' 或 'zh'。
 */
function getLocale(request: NextRequest): string {
  try {
    // 1. 从请求头中，解析出用户浏览器偏好的语言列表 (e.g., ['zh-CN', 'zh', 'en'])
    const negotiatorHeaders: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      // 过滤和清理请求头，特别是 Accept-Language
      if (key.toLowerCase() === 'accept-language' && value) {
        // 移除可能导致解析失败的特殊字符，保留语言标识符所需的字符
        const cleanValue = value.replace(/[^\w\-,;=.\s]/g, '')
        if (cleanValue.trim()) {
          negotiatorHeaders[key] = cleanValue
        }
      } else {
        negotiatorHeaders[key] = value
      }
    })
    
    // 检查是否有有效的 Accept-Language 头
    if (!negotiatorHeaders['accept-language']) {
      return i18n.defaultLocale
    }
    
    const languages = new Negotiator({ headers: negotiatorHeaders }).languages()

    // 2. 如果没有语言偏好或解析失败，返回默认语言
    if (!languages || languages.length === 0) {
      return i18n.defaultLocale
    }

    // 3. 将用户偏好列表与我们支持的语言列表进行匹配，找出最佳选择
    return matchLocale(languages, i18n.locales, i18n.defaultLocale)
  } catch (error) {
    // 提供更详细的错误信息，但避免记录敏感信息
    const errorMessage = error instanceof Error ? error.message : String(error)
    const acceptLanguage = request.headers.get('accept-language')
    
    logger.warn('Middleware', 'Locale matching failed, using default locale', { 
      error: errorMessage,
      acceptLanguage: acceptLanguage?.substring(0, 100), // 限制长度避免日志过长
      hasAcceptLanguage: !!acceptLanguage
    })
    return i18n.defaultLocale
  }
}

// 定义受保护的路由
const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/(zh|en)/admin(.*)'
])

// 直接导出 clerkMiddleware，不要包装
export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname
  
  try {
    // 图片防盗链保护
    if (isImageRequest(pathname) || isSanityImage(pathname)) {
      const isAllowed = checkImageReferer(req)
      logImageAccess(req, isAllowed)
      
      if (!isAllowed) {
        return createHotlinkProtectionResponse()
      }
    }
    
    // 认证检查 - 关键：确保这里的调用是正确的
    if (isProtectedRoute(req)) {
      // 使用 auth.protect() 进行路由保护
      auth.protect()
    }
    
    // 跳过 API 路由的国际化处理
    if (pathname.startsWith('/api/')) {
      return NextResponse.next()
    }

    // 国际化重定向
    const pathnameIsMissingLocale = i18n.locales.every(
      (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
    )

    if (pathnameIsMissingLocale) {
      const locale = getLocale(req)
      return NextResponse.redirect(
        new URL(
          `/${locale}${pathname.startsWith('/') ? '' : '/'}${pathname}`,
          req.url
        )
      )
    }
  } catch (error) {
    // 记录错误但不要抛出，避免中断中间件流程
    logger.error(
      'Middleware', 
      'Error in clerkMiddleware',
      error instanceof Error ? error : new Error(String(error)),
      {
        pathname,
        errorType: error instanceof Error ? error.name : 'Unknown'
      }
    )
    
    // 对于受保护的路由，如果认证失败，让 Clerk 处理
    if (isProtectedRoute(req)) {
      throw error
    }
  }
})

// 中间件配置

export const config = {
  // 这个 matcher 定义了中间件将在哪些路径上运行。
  // 这个正则表达式的作用是：排除所有包含 '.' 的文件（如图片、css等静态资源）
  // 和 Next.js 的内部路由（_next），但对其他所有路径生效。
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}

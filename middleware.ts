// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { i18n } from './i18n-config'
import { match as matchLocale } from '@formatjs/intl-localematcher'
import Negotiator from 'negotiator'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

/**
 * @description 获取请求中最匹配的地域语言。
 * @param request - Next.js 的请求对象。
 * @returns 匹配到的语言代码，如 'en' 或 'zh'。
 */
function getLocale(request: NextRequest): string {
  try {
    // 1. 从请求头中，解析出用户浏览器偏好的语言列表 (e.g., ['zh-CN', 'zh', 'en'])
    const negotiatorHeaders: Record<string, string> = {}
    request.headers.forEach((value, key) => (negotiatorHeaders[key] = value))
    const languages = new Negotiator({ headers: negotiatorHeaders }).languages()

    // 2. 如果没有语言偏好或解析失败，返回默认语言
    if (!languages || languages.length === 0) {
      return i18n.defaultLocale
    }

    // 3. 将用户偏好列表与我们支持的语言列表进行匹配，找出最佳选择
    return matchLocale(languages, i18n.locales, i18n.defaultLocale)
  } catch (error) {
    // 如果 locale 匹配失败，返回默认语言
    console.warn('Locale matching failed, using default locale:', error)
    return i18n.defaultLocale
  }
}

// 定义哪些路由是受保护的。这是一个"黑名单"，所有匹配的路径都需要用户登录。
const isProtectedRoute = createRouteMatcher([
  '/admin(.*)', // /admin 及其所有子路由
])

// 导出我们的主中间件函数，由 Clerk 的 clerkMiddleware 进行包装
export default clerkMiddleware(async (auth, req) => {
  // --- 步骤一：优先处理认证 (Authentication First) ---
  // 检查当前请求的路径是否在我们定义的"受保护列表"中
  if (isProtectedRoute(req)) {
    // 如果是受保护的路由，则调用 auth.protect()。
    // 这个函数会检查用户是否登录：
    // - 如果已登录，则允许请求继续。
    // - 如果未登录，它会自动将用户重定向到 Clerk 的登录页面。
    await auth.protect()
  }

  // --- 步骤二：处理国际化重定向 (Internationalization Next) ---
  // 这个逻辑只会在请求通过了上面的认证检查（或者本身就是公共路由）后才执行。
  const pathname = req.nextUrl.pathname

  // 跳过 API 路由的国际化处理
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 检查请求路径是否已经包含了语言前缀 (e.g., /en/about)
  const pathnameIsMissingLocale = i18n.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  )

  // 如果路径缺少语言前缀，我们就为他重定向到一个带语言前缀的 URL
  if (pathnameIsMissingLocale) {
    const locale = getLocale(req) // 获取最匹配的语言
    // 例如，如果用户访问 /gallery，而检测到的语言是 'zh'，我们将他重定向到 /zh/gallery。
    return NextResponse.redirect(
      new URL(
        `/${locale}${pathname.startsWith('/') ? '' : '/'}${pathname}`,
        req.url
      )
    )
  }
})

export const config = {
  // 这个 matcher 定义了中间件将在哪些路径上运行。
  // 这个正则表达式的作用是：排除所有包含 '.' 的文件（如图片、css等静态资源）
  // 和 Next.js 的内部路由（_next），但对其他所有路径生效。
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}

// middleware.ts

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// 1. 定义哪些路由是受保护的
//    任何匹配这个列表的路由，如果用户未登录，Clerk 会自动处理重定向
const isProtectedRoute = createRouteMatcher([
  '/admin(.*)', // /admin 及其所有子路由
  // 未来可以添加更多受保护的路径，比如 '/dashboard(.*)'
])

// 2. 将 isProtectedRoute 函数作为“保护规则”传入 clerkMiddleware
export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    // 这行代码告诉 Clerk：“对于所有受保护的路由，请执行你的标准保护流程”
    // 这包括检查用户是否登录，如果没有，则重定向到登录页面
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // 排除所有包含 '.' 的文件（如 static assets）和 Next.js 的内部路由
    '/((?!.*\\..*|_next).*)',
    // 包含根目录
    '/',
    // 包含所有 API 和 tRPC 路由
    '/(api|trpc)(.*)',
  ],
}

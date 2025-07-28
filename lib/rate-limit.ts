// lib/rate-limit.ts
import { auth } from '@clerk/nextjs/server'

// 简单的内存存储，用于开发环境
// 生产环境建议使用 Redis 或其他持久化存储
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

interface RateLimitOptions {
  maxRequests: number // 最大请求数
  windowMs: number // 时间窗口（毫秒）
}

export async function checkRateLimit(
  action: string,
  options: RateLimitOptions = { maxRequests: 10, windowMs: 60000 } // 默认：1分钟内最多10次
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const { userId } = await auth()
  
  // 如果用户未登录，不进行限流（因为未登录用户无法执行操作）
  if (!userId) {
    return { allowed: true, remaining: options.maxRequests, resetTime: 0 }
  }

  const key = `${userId}:${action}`
  const now = Date.now()
  
  // 获取或创建用户的限流记录
  let userLimit = rateLimitStore.get(key)
  
  // 如果没有记录或时间窗口已过期，重置计数
  if (!userLimit || now > userLimit.resetTime) {
    userLimit = {
      count: 0,
      resetTime: now + options.windowMs,
    }
  }
  
  // 检查是否超过限制
  if (userLimit.count >= options.maxRequests) {
    rateLimitStore.set(key, userLimit)
    return {
      allowed: false,
      remaining: 0,
      resetTime: userLimit.resetTime,
    }
  }
  
  // 增加计数
  userLimit.count++
  rateLimitStore.set(key, userLimit)
  
  return {
    allowed: true,
    remaining: options.maxRequests - userLimit.count,
    resetTime: userLimit.resetTime,
  }
}

// 清理过期的限流记录（可以定期调用）
export function cleanupExpiredLimits() {
  const now = Date.now()
  for (const [key, limit] of rateLimitStore.entries()) {
    if (now > limit.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}
// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// 仅在生产环境启用 Sentry Edge
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    
    // Edge环境采样率 - 更保守的设置
    tracesSampleRate: 0.1,
    sampleRate: 1.0,
    
    // Edge环境日志设置
    enableLogs: true,
    debug: false,
    environment: 'production',
    
    // 发布版本
    release: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    
    // Edge环境错误过滤
    beforeSend(event, hint) {
      const error = hint.originalException as Error
      
      if (error) {
        // 添加Edge环境标识
        event.tags = {
          ...event.tags,
          runtime: 'edge',
          module: (event.extra?.module as string) || 'middleware'
        }
      }
      
      // 过滤Edge环境常见的非关键错误
      if (event.exception?.values?.[0]?.value?.includes('Network Error') ||
          event.exception?.values?.[0]?.value?.includes('Failed to fetch')) {
        return null
      }
      
      return event
    },
    
    // 忽略Edge环境特定错误 - 仅忽略确定的噪音错误
    ignoreErrors: [
      // 客户端网络错误（Edge环境不应该处理）
      'Network Error',
      'Failed to fetch',
      
      // Edge环境正常的中断操作
      'AbortError',
    ],
    
    // Edge环境URL过滤
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ]
  })
  
  console.log('[INFO] Sentry Edge initialized in production mode')
} else {
  // 开发环境完全禁用 Sentry Edge
  console.log('[DEBUG] Sentry Edge disabled in development environment')
}

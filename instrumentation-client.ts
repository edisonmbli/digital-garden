// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// 仅在生产环境启用 Sentry 客户端
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // 生产环境集成配置
    integrations: [
      Sentry.replayIntegration(),
    ],

    // 生产环境采样率配置
    tracesSampleRate: 0.1, // 降低性能追踪采样率
    sampleRate: 1.0, // 保持错误采样率100%
    
    // 启用日志但关闭调试
    enableLogs: true,
    debug: false,
    
    // 环境标识
    environment: 'production',
    
    // 发布版本
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'unknown',

    // Replay 采样率 - 生产环境降低
    replaysSessionSampleRate: 0.05, // 降低到5%
    replaysOnErrorSampleRate: 0.5, // 错误时50%采样
    
    // 客户端错误过滤
    beforeSend(event, hint) {
      const error = hint.originalException as Error
      
      if (error) {
        // 添加客户端环境标识
        event.tags = {
          ...event.tags,
          runtime: 'browser',
          module: (event.extra?.module as string) || 'client'
        }
      }
      
      return event
    },
    
    // 忽略客户端常见非关键错误
    ignoreErrors: [
      // 网络相关错误
      'Network Error',
      'Failed to fetch',
      'Load failed',
      'NetworkError',
      
      // 浏览器扩展错误
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',
      
      // 第三方脚本错误
      'Script error',
      'Javascript error',
      
      // 客户端特有错误
      'ChunkLoadError',
      'Loading chunk',
      'Loading CSS chunk',
    ],
    
    // 忽略特定URL
    denyUrls: [
      // 浏览器扩展
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
      
      // 第三方脚本
      /googletagmanager/i,
      /google-analytics/i,
      /googleadservices/i,
    ]
  });
  
  console.log('[INFO] Sentry client initialized in production mode');
} else {
  // 开发环境完全禁用 Sentry 客户端
  console.log('[DEBUG] Sentry client disabled in development environment');
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
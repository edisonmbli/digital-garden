import * as Sentry from '@sentry/nextjs';

export async function register() {
  // 添加全局 unhandledRejection 监听器用于调试（仅开发环境）
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_RUNTIME === 'nodejs') {
    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 [UNHANDLED REJECTION] Detailed Error Information:')
      console.error('Reason:', reason)
      console.error('Promise:', promise)
      if (reason instanceof Error) {
        console.error('Error Name:', reason.name)
        console.error('Error Message:', reason.message)
        console.error('Stack Trace:', reason.stack)
      }
      console.error('Process:', process.pid)
      console.error('Timestamp:', new Date().toISOString())
    })
  }

  // 仅在生产环境加载 Sentry
  if (process.env.NODE_ENV === 'production') {
    console.log('[DEBUG] Loading Sentry in production environment')
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      await import('./sentry.server.config')
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
      await import('./sentry.edge.config')
    }
  } else {
    console.log('[DEBUG] Skipping Sentry in development environment')
  }
}

// 仅在生产环境导出 Sentry 错误捕获
export const onRequestError = process.env.NODE_ENV === 'production' 
  ? Sentry.captureRequestError 
  : undefined;

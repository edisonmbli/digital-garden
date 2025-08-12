import * as Sentry from '@sentry/nextjs';

export async function register() {
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

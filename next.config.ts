import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 优化 Framer Motion 的打包
  transpilePackages: ['framer-motion'],

  // 实验性功能：减少开发环境警告
  experimental: {
    // 启用更好的错误处理
    optimizePackageImports: ['@sentry/nextjs'],
  },

  // 图片优化配置 - 双层代理架构
  images: {
    // 移除全局自定义loader配置，改为在组件级别使用
    // loader: 'custom',
    // loaderFile: './lib/secure-image-loader.ts',
    
    // 允许的图片域名配置
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      // 允许本地安全端点作为图片源
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/images/secure/**',
      },
      {
        protocol: 'https',
        hostname: 'edisonmbli.com',
        pathname: '/api/images/secure/**',
      },
      {
        protocol: 'https',
        hostname: '*.vercel.app',
        pathname: '/api/images/secure/**',
      },
    ],
    
    // 图片质量和格式优化
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512, 768, 1024],
    
    // 启用 Next.js 图片优化（双层代理的关键）
    unoptimized: false,
    
    // 缓存优化配置
    minimumCacheTTL: 31536000, // 1年（图片内容基于hash，安全）
    dangerouslyAllowSVG: true, // 启用SVG支持
    contentDispositionType: 'attachment', // 安全考虑
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // 安全头配置
  async headers() {
    return [
      // 图片和静态资源缓存优化
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          // 防止点击劫持攻击
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // 防止 MIME 类型嗅探
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // XSS 保护
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // 引用者策略
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // 权限策略
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          // API 路由的额外安全头
          {
            key: 'X-Robots-Tag',
            value: 'noindex',
          },
        ],
      },
    ]
  },
}

// module.exports = nextConfig

// 仅在生产环境启用Sentry
export default process.env.NODE_ENV === 'production'
  ? withSentryConfig(nextConfig, {
      // For all available options, see:
      // https://www.npmjs.com/package/@sentry/webpack-plugin#options

      org: 'solo-jc',
      project: 'digital-garden',

      // Only print logs for uploading source maps in CI
      silent: !process.env.CI,

      // For all available options, see:
      // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

      // Upload a larger set of source maps for prettier stack traces (increases build time)
      widenClientFileUpload: true,

      // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
      // This can increase your server load as well as your hosting bill.
      // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
      // side errors will fail.
      tunnelRoute: '/monitoring',

      // Automatically tree-shake Sentry logger statements to reduce bundle size
      disableLogger: true,

      // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
      // See the following for more information:
      // https://docs.sentry.io/product/crons/
      // https://vercel.com/docs/cron-jobs
      automaticVercelMonitors: true,
    })
  : nextConfig

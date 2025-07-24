/** @type {import('next').NextConfig} */
const nextConfig = {
  // 优化 Framer Motion 的打包
  transpilePackages: ['framer-motion'],

  // 图片优化配置 - 添加 Sanity CDN 域名
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        port: '',
        pathname: '/images/**',
      },
    ],
    // 可选：图片质量和格式优化
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}

module.exports = nextConfig

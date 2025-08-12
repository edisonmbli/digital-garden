// sanity/client.ts

import { createClient } from 'next-sanity'

// 从 .env.local 文件中读取你的 Sanity 项目配置
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION

// 标准 Sanity 客户端配置
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // 使用 CDN 以获得最佳性能
})

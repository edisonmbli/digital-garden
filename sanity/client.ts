// sanity/client.ts

import { createClient } from 'next-sanity'

// 从 .env.local 文件中读取你的 Sanity 项目配置
// 为了让 TypeScript 识别这些环境变量，你可能需要在项目根目录的 next-env.d.ts 文件中
// 添加如下声明：
// declare namespace NodeJS {
//   interface ProcessEnv {
//     NEXT_PUBLIC_SANITY_PROJECT_ID: string;
//     NEXT_PUBLIC_SANITY_DATASET: string;
//     NEXT_PUBLIC_SANITY_API_VERSION: string;
//   }
// }
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION

// 这是我们用于获取公开的、已发布内容的客户端
// 它使用了 CDN 以获得最佳性能
export const client = createClient({
  projectId,
  dataset,
  apiVersion, // https://www.sanity.io/docs/api-versioning
  useCdn: true, // `false` if you want to ensure fresh data
})

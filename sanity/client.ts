// sanity/client.ts
// 已弃用：建议新代码使用 lib/sanity-server.ts
// 此文件保留用于向后兼容，但不应在新代码中使用

import { sanityServerClient } from '@/lib/sanity-server'

// 为了向后兼容，重新导出服务端客户端
// 建议直接使用 sanityServerClient
export const client = sanityServerClient

// 已弃用的配置导出（为了向后兼容）
export const projectId = 'deprecated-use-server-config'
export const dataset = 'deprecated-use-server-config'
export const apiVersion = 'deprecated-use-server-config'

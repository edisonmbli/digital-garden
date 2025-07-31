// app/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// 声明全局变量类型
declare global {
  var __prisma: PrismaClient | undefined
}

// 创建 Prisma 客户端实例的函数
const createPrismaClient = () => {
  return new PrismaClient({
    // 配置连接池
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // 配置日志级别
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // 配置错误格式
    errorFormat: 'pretty',
  })
}

// 使用单例模式确保只有一个 Prisma 客户端实例
const prisma = globalThis.__prisma ?? createPrismaClient()

// 在开发环境下将实例保存到全局变量，避免热重载时创建多个实例
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma
}

// 优雅关闭处理 - 仅在 Node.js 运行时环境中执行
if (process.env.NODE_ENV === 'production' && typeof process !== 'undefined' && process.on) {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

export default prisma

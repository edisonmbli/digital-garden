import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

async function checkAdminAccess() {
  const authResult = await auth()
  const { userId, sessionClaims, getToken } = authResult

  if (!userId) {
    redirect('/sign-in')
  }

  // 优先尝试从自定义 JWT 模板获取角色信息
  try {
    const customToken = await getToken({ template: 'default' })
    if (customToken) {
      const payload = JSON.parse(atob(customToken.split('.')[1]))
      const customMetadata = payload?.metadata as
        | Record<string, unknown>
        | undefined
      if (customMetadata?.role === 'admin') {
        return true
      }
    }
  } catch {
    // JWT 模板获取失败，继续使用兜底方案
  }

  // 兜底方案1：检查 sessionClaims 中的 metadata
  const metadata = sessionClaims?.metadata as
    | Record<string, unknown>
    | undefined
  const publicMetadata = sessionClaims?.publicMetadata as
    | Record<string, unknown>
    | undefined

  if (metadata?.role === 'admin' || publicMetadata?.role === 'admin') {
    return true
  }

  // 兜底方案2：通过 Clerk API 获取用户信息
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    if (user.publicMetadata?.role === 'admin') {
      return true
    }
  } catch {
    // API 调用失败，拒绝访问
  }

  // 如果所有方法都失败，拒绝访问
  redirect('/')
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await checkAdminAccess()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">{children}</div>
    </div>
  )
}

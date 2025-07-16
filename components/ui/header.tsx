// app/ui/header.tsx
'use client'

import Link from 'next/link'
import { UserButton, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { Button } from './button'
import { ThemeToggle } from './theme-toggle' // 导入我们之前创建的 ThemeToggle

export function Header() {
  return (
    <header className="py-4 border-b">
      <nav className="container mx-auto flex justify-between items-center">
        {/* Logo 和站点名称，链接到首页 */}
        <Link href="/" className="font-bold text-xl tracking-tight">
          光影代码
        </Link>

        {/* 右侧的工具栏 */}
        <div className="flex items-center gap-4">
          <ThemeToggle /> {/* 主题切换按钮 */}
          {/* 当用户未登录时，显示这两个按钮 */}
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="outline">Sign In</Button>
            </SignInButton>
          </SignedOut>
          {/* 当用户已登录时，显示这个头像按钮 */}
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </nav>
    </header>
  )
}

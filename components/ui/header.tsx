// app/ui/header.tsx
'use client'

import Link from 'next/link'
import { UserButton, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { Button } from './button'
import { ThemeToggle } from './theme-toggle' // 导入我们之前创建的 ThemeToggle
import { LanguageSwitcher } from './language-switcher' // 1. 导入新的语言切换器
import { Separator } from '@/components/ui/separator' // 2. 导入分隔符组件 (需 pnpm dlx shadcn@latest add separator)

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
          {/*  “站点工具”组 */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          <SignedIn>
            {/*  视觉分隔符 */}
            <Separator orientation="vertical" className="h-6" />
            {/* “用户中心”组 */}
            <UserButton />
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="outline">Sign In</Button>
            </SignInButton>
          </SignedOut>
        </div>
      </nav>
    </header>
  )
}

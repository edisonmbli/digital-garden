// app/ui/header.tsx

import Link from 'next/link'
import { headers } from 'next/headers'
import { UserButton, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { Button } from './button'
import { ThemeToggle } from './theme-toggle' // 导入我们之前创建的 ThemeToggle
import { LanguageSwitcher } from './language-switcher' // 导入新的语言切换器
import { Separator } from '@/components/ui/separator' // 导入分隔符组件
import { getDictionary } from '@/lib/dictionary' // 导入我们的字典函数
import { type Locale, i18n } from '@/i18n-config'

export async function Header() {
  const headersList = await headers()
  const lang = (headersList.get('x-locale') as Locale) || i18n.defaultLocale
  const dictionary = await getDictionary(lang)

  return (
    <header className="py-4 border-b">
      <nav className="container mx-auto flex justify-between items-center">
        {/* Logo 和站点名称，链接到首页 */}
        <Link href="`/${lang}`" className="font-bold text-xl tracking-tight">
          {dictionary.homepage.title} {/* <-- 使用字典 */}
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
            <Separator orientation="vertical" className="h-6 bg-border" />
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

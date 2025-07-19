// app/ui/header.tsx

import Link from 'next/link'
import { headers } from 'next/headers'
import { UserButton, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/app/ui/theme-toggle'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { getDictionary } from '@/lib/dictionary'
import { type Locale, i18n } from '@/i18n-config'
import { MobileNav } from '@/app/ui/mobile-nav'

export async function Header() {
  const headersList = await headers()
  const lang = (headersList.get('x-locale') as Locale) || i18n.defaultLocale
  const dictionary = await getDictionary(lang)

  const navItems = [
    { href: `/${lang}/about`, label: dictionary.header.about },
    { href: `/${lang}/gallery`, label: dictionary.header.gallery },
    { href: `/${lang}/log`, label: dictionary.header.log },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* 导航栏 */}
        <div className="flex items-center gap-6">
          {/* 移动端导航：只在小于 md 断点时显示 */}
          <div className="md:hidden">
            <MobileNav navItems={navItems} dictionary={dictionary} />
          </div>
          {/* 桌面导航：只在大于 md 断点时显示 */}
          <Link
            href={`/${lang}`}
            className="hidden font-bold text-xl tracking-tight md:block"
          >
            {dictionary.header.title}
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* 登录按钮 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          <SignedIn>
            <div className="h-6 w-px bg-border" />
            <UserButton />
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="outline">{dictionary.header.signIn}</Button>
            </SignInButton>
          </SignedOut>
        </div>
      </nav>
    </header>
  )
}

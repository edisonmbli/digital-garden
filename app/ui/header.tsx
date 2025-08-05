// app/ui/header.tsx

import Link from 'next/link'
import { UserButton, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/app/ui/theme-toggle'
import { LanguageSwitcher } from '@/app/ui/language-switcher'
import { getDictionary } from '@/lib/dictionary'
import { type Locale } from '@/i18n-config'
import { MobileNav } from '@/app/ui/mobile-nav'

type DictionaryType = Awaited<ReturnType<typeof getDictionary>>

export async function Header({
  lang,
  dictionary,
}: {
  lang: Locale
  dictionary: DictionaryType
}) {
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
            className="hidden text-display-sm font-semibold md:block link-elegant text-foreground hover:text-foreground">
            {dictionary.header.title}
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-label-xl font-sans font-light text-muted-foreground transition-all duration-300 hover:text-foreground hover:tracking-wide"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* 登录按钮 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {/* <LanguageSwitcher currentLocale={lang} /> */}
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

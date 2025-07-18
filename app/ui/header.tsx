// app/ui/header.tsx

import Link from 'next/link'
import { headers } from 'next/headers'
import { UserButton, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { getDictionary } from '@/lib/dictionary'
import { type Locale, i18n } from '@/i18n-config'

export async function Header() {
  const headersList = await headers()
  const lang = (headersList.get('x-locale') as Locale) || i18n.defaultLocale
  const dictionary = await getDictionary(lang)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={`/${lang}`} className="font-bold text-xl tracking-tight">
          {dictionary.homepage.title}
        </Link>

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
              <Button variant="outline">{dictionary.homepage.sign_in}</Button>
            </SignInButton>
          </SignedOut>
        </div>
      </nav>
    </header>
  )
}

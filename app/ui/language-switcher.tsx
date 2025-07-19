// app/ui/language-switcher.tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { type Locale } from '@/i18n-config'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Languages } from 'lucide-react'

export function LanguageSwitcher() {
  const pathName = usePathname()
  const router = useRouter()

  const redirectedPathName = (locale: Locale) => {
    if (!pathName) return '/'
    const segments = pathName.split('/')
    segments[1] = locale
    return segments.join('/')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(redirectedPathName('en'))}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(redirectedPathName('zh'))}>
          中文
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

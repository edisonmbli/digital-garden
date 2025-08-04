'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Camera } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { type NavItem } from '@/types/index'
import { getDictionary } from '@/lib/dictionary'

type DictionaryType = Awaited<ReturnType<typeof getDictionary>>

export function MobileNav({
  navItems,
  dictionary,
}: {
  navItems: NavItem[]
  dictionary: DictionaryType
}) {
  const [open, setOpen] = React.useState(false)
  const pathName = usePathname()
  const lang = pathName.split('/')[1]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0 bg-white/80">
        {/* 添加 SheetHeader 和 SheetTitle 来满足无障碍要求 */}
        <SheetHeader>
          <SheetTitle className="sr-only">
            {dictionary.header.title} Navigation Menu
          </SheetTitle>
        </SheetHeader>

        <Link
          href={`/${lang}`}
          className="mr-6 flex items-center space-x-2"
          onClick={() => setOpen(false)}
        >
          <Camera className="h-6 w-6 ml-4 dark:text-black/90" />
          <span className="text-xl font-medium tracking-tight dark:text-black/90">{dictionary.header.title}</span>
        </Link>

        <div className="my-3 h-[calc(100vh-8rem)] pb-10 pl-6">
          <nav className="flex flex-col space-y-4" role="navigation">
            {navItems?.map(
              (item) =>
                item.href && (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="text-md font-base dark:text-black/80 text-muted-foreground transition-all duration-300 hover:text-foreground hover:translate-x-2 active:scale-95"
                  >
                    {item.label}
                  </Link>
                )
            )}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  )
}

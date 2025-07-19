// app/ui/mobile-nav.tsx
'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation' // 1. 导入 usePathname Hook
import { Menu, Mountain } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { type NavItem } from '@/types/index' // 我们将创建一个类型文件来共享导航项
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
  const pathName = usePathname() // 2. 获取当前 URL 路径 (e.g., /en/gallery)

  // 3. 从路径中，动态地、可靠地解析出当前的语言代码
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
      <SheetContent side="left" className="pr-0">
        <Link
          href={`/${lang}`} // 4. 使用动态解析出的 lang，确保链接永远正确
          className="mr-6 flex items-center space-x-2"
          onClick={() => setOpen(false)}
        >
          <Mountain className="h-6 w-6" />
          <span className="font-bold">{dictionary.header.title}</span>
        </Link>
        <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
          <div className="flex flex-col space-y-3">
            {navItems?.map(
              (item) =>
                item.href && (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                )
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

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
import { getTranslationMapAction } from '@/lib/actions'
import { useState } from 'react'

export function LanguageSwitcher() {
  const pathName = usePathname()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const redirectedPathName = async (locale: Locale) => {
    if (!pathName) return `/${locale}`

    const segments = pathName.split('/')

    // 检测当前页面类型和 slug
    if (segments[2] === 'gallery' && segments[3]) {
      // Collection 页面
      const currentSlug = segments[3]
      const currentLang = segments[1] as Locale

      try {
        setIsLoading(true)
        const translationMap = await getTranslationMapAction(
          currentSlug,
          currentLang,
          'collection'
        )

        const targetSlug = translationMap[locale]
        if (targetSlug) {
          return `/${locale}/gallery/${targetSlug}`
        }
      } catch (error) {
        console.error('Failed to get translation map:', error)
      } finally {
        setIsLoading(false)
      }
    } else if (segments[2] === 'log' && segments[3]) {
      // Log 页面
      const currentSlug = segments[3]
      const currentLang = segments[1] as Locale

      try {
        setIsLoading(true)
        const translationMap = await getTranslationMapAction(
          currentSlug,
          currentLang,
          'log'
        )

        const targetSlug = translationMap[locale]
        if (targetSlug) {
          return `/${locale}/log/${targetSlug}`
        }
      } catch (error) {
        console.error('Failed to get translation map:', error)
      } finally {
        setIsLoading(false)
      }
    }

    // 回退到简单的语言替换
    segments[1] = locale
    return segments.join('/')
  }

  const handleLanguageSwitch = async (locale: Locale) => {
    const targetPath = await redirectedPathName(locale)
    router.push(targetPath)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isLoading}>
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleLanguageSwitch('en')}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleLanguageSwitch('zh')}>
          中文
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

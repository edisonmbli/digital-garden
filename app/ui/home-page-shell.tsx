'use client'

import { getDictionary } from '@/lib/dictionary'
import { FeaturedGroup } from '@/types/sanity'
import { Locale } from '@/i18n-config'
import { HeroSection } from './hero-section'

type DictionaryType = Awaited<ReturnType<typeof getDictionary>>

interface HomePageShellProps {
  dictionary: DictionaryType
  collections: FeaturedGroup[]
  lang: Locale
}

export function HomePageShell({ collections, lang }: HomePageShellProps) {
  return (
    <div className="w-full">
      {/* 英雄区 - 占据整个视口高度 */}
      <HeroSection collections={collections} lang={lang} />

      {/* 描述文本区域 - 在英雄区下方，减少空白 */}
      <div className="w-full py-4 bg-background/95">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* <p className="mx-auto max-w-[700px] text-body-lg text-foreground/80 leading-relaxed">
              {dictionary.homepage.description}
            </p> */}
          </div>
        </div>
      </div>
    </div>
  )
}

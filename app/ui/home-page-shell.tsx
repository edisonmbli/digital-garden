// app/ui/home-page-shell.tsx
import { headers } from 'next/headers'
import { Button } from '@/components/ui/button'
import { getDictionary } from '@/lib/dictionary'
import { type Locale, i18n } from '@/i18n-config'

export async function HomePageShell() {
  const headersList = await headers()
  const lang = (headersList.get('x-locale') as Locale) || i18n.defaultLocale
  const dictionary = await getDictionary(lang)

  return (
    <div className="container relative h-[calc(100vh-10rem)] flex flex-col items-center justify-center text-center">
      {/* 在第六章，这里会变成一个背景图/视频 */}
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative">
        <h1 className="text-5xl font-bold tracking-tighter sm:text-7xl">
          {dictionary.homepage.title}
        </h1>
        <p className="mx-auto mt-4 max-w-[700px] text-lg text-muted-foreground">
          {dictionary.homepage.description}
        </p>
        <div className="mt-8">
          <Button size="lg">{dictionary.homepage.enter_button}</Button>
        </div>
      </div>
    </div>
  )
}

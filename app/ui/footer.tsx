// app/ui/Footer.tsx
import Link from 'next/link'
import { getDictionary } from '@/lib/dictionary'
import { headers } from 'next/headers'
import { type Locale, i18n } from '@/i18n-config'

export async function Footer() {
  const headersList = await headers()
  const lang = (headersList.get('x-locale') as Locale) || i18n.defaultLocale
  const dictionary = await await getDictionary(lang)

  return (
    <footer className="w-full py-6 border-t">
      <div className="container mx-auto flex flex-col items-center justify-center gap-4 px-4 sm:px-6 lg:px-8 md:h-24">
        <p className="text-balance text-center text-sm leading-loose text-muted-foreground">
          {dictionary.footer.built_in_public_by_}{' '}
          {dictionary.footer.source_code_available_on_}
          <Link
            href="https://github.com/edisonmbli/digital-garden"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            GitHub
          </Link>
          .
        </p>
      </div>
    </footer>
  )
}

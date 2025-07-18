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
    <footer className="py-6 md:px-8 md:py-0 border-t">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
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

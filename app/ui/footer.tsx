// app/ui/Footer.tsx
import Link from 'next/link'
import { getDictionary } from '@/lib/dictionary'
import { type Locale } from '@/i18n-config'

type DictionaryType = Awaited<ReturnType<typeof getDictionary>>

export async function Footer({ 
  dictionary, 
  lang 
}: { 
  dictionary: DictionaryType
  lang: Locale 
}) {
  return (
    <footer className="w-full py-3 border-t border-border/40">
      {' '}
      {/* 与header保持一致的边框样式 */}
      <div className="container mx-auto flex flex-col items-center justify-center gap-4 px-4 sm:px-6 lg:px-8 ">
        <p className="text-body-xs text-center text-muted-foreground">
          {dictionary.footer.built_in_public_by_}{' '}
          <Link
            href={`/${lang}/terms`}
            className="font-base underline underline-offset-4 hover:text-foreground transition-colors"
          >
            {dictionary.footer.terms_of_use}
          </Link>
          .
        </p>
      </div>
    </footer>
  )
}

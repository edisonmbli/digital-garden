// app/ui/Footer.tsx
import Link from 'next/link'
import { getDictionary } from '@/lib/dictionary'

type DictionaryType = Awaited<ReturnType<typeof getDictionary>>

export async function Footer({ dictionary }: { dictionary: DictionaryType }) {
  return (
    <footer className="w-full py-3 border-t border-border/40">
      {' '}
      {/* 与header保持一致的边框样式 */}
      <div className="container mx-auto flex flex-col items-center justify-center gap-4 px-4 sm:px-6 lg:px-8 ">
        <p className="text-balance text-right text-sm leading-loose text-muted-foreground">
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

// app/ui/log-page-shell.tsx
import { headers } from 'next/headers'
import { placeholderLogs } from '@/lib/placeholder-data'
import Link from 'next/link'
import { getDictionary } from '@/lib/dictionary'
import { type Locale, i18n } from '@/i18n-config'

export async function LogPageShell() {
  const headersList = await headers()
  const lang = (headersList.get('x-locale') as Locale) || i18n.defaultLocale
  const dictionary = await getDictionary(lang)

  return (
    <div className="container py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold">{dictionary.develop.title}</h1>
        <p className="text-muted-foreground mt-2">
          {dictionary.develop.description}
        </p>
        {/* 未来这里的搜索/筛选区 */}
      </div>
      <div className="space-y-4">
        {placeholderLogs.map((log) => (
          <Link
            key={log.slug}
            href={`/log/${log.slug}`}
            className="block p-4 border rounded-lg hover:bg-muted"
          >
            <h3 className="font-semibold">{log.title}</h3>
          </Link>
        ))}
      </div>
    </div>
  )
}

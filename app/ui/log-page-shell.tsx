// app/ui/log-page-shell.tsx
import { placeholderLogs } from '@/lib/placeholder-data'
import Link from 'next/link'
import { getDictionary } from '@/lib/dictionary'

type DictionaryType = Awaited<ReturnType<typeof getDictionary>>

export async function LogPageShell({
  dictionary,
}: {
  dictionary: DictionaryType
}) {
  return (
    <div className="w-full py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
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
    </div>
  )
}

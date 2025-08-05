// app/ui/dev-collection-card.tsx
import Link from 'next/link'
import Image from 'next/image'
import { type DevCollection } from '@/types/sanity'
import { type Locale } from '@/i18n-config'
import { getDictionary } from '@/lib/dictionary'

type DictionaryType = Awaited<ReturnType<typeof getDictionary>>

interface DevCollectionCardProps {
  collection: DevCollection
  lang: Locale
  dictionary: DictionaryType
}

export function DevCollectionCard({ collection, lang, dictionary }: DevCollectionCardProps) {
  const collectionName = collection.name[lang] || collection.name.en || 'Untitled Collection'
  const collectionDescription = collection.description?.[lang] || collection.description?.en || ''
  const logsCount = collection.logs?.length || 0

  return (
    <div className="group relative bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* Cover Image */}
      <div className="relative aspect-video bg-muted">
        {collection.coverImageUrl ? (
          <Image
            src={collection.coverImageUrl}
            alt={collectionName}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <div className="text-muted-foreground text-body-sm">No Cover Image</div>
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Collection info overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-white text-body-lg font-semibold mb-1 line-clamp-2">
            {collectionName}
          </h3>
          <p className="text-white/80 text-body-sm">
            {logsCount} {dictionary.develop.logsCount}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {collectionDescription && (
          <p className="text-muted-foreground text-body-sm mb-4 line-clamp-3">
            {collectionDescription}
          </p>
        )}

        {/* Logs preview */}
        {collection.logs && collection.logs.length > 0 && (
          <div className="space-y-2 mb-4">
            {collection.logs.slice(0, 4).map((log) => (
              <Link
                key={log._id}
                href={`/${lang}/log/${log.slug}`}
                className="block group/log"
              >
                <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                  <span className="text-body-sm text-foreground group-hover/log:text-primary transition-colors line-clamp-1">
                    {log.title}
                  </span>
                </div>
              </Link>
            ))}
            {collection.logs.length > 4 && (
              <div className="text-caption-xs text-muted-foreground pl-4">
                +{collection.logs.length - 4} more articles...
              </div>
            )}
          </div>
        )}

        {/* Read More Button */}
        <Link
          href={`/${lang}/log/${collection.logs?.[0]?.slug || ''}`}
          className="inline-flex items-center text-body-sm font-medium text-primary hover:text-primary/80 transition-colors">
          {dictionary.develop.readMore}
          <svg
            className="ml-1 w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    </div>
  )
}
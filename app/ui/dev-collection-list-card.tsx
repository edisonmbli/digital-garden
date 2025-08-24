'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { type DevCollection } from '@/types/sanity'
import { type Locale } from '@/i18n-config'
import { type getDictionary } from '@/lib/dictionary'

type DictionaryType = Awaited<ReturnType<typeof getDictionary>>

interface DevCollectionListCardProps {
  collection: DevCollection
  lang: Locale
  dictionary: DictionaryType
  isExpanded: boolean
  onToggleExpand: () => void
}

export function DevCollectionListCard({
  collection,
  lang,
  dictionary,
  isExpanded,
  onToggleExpand,
}: DevCollectionListCardProps) {
  const collectionName =
    collection.name[lang] || collection.name.en || 'Untitled Collection'
  const collectionDescription =
    collection.description?.[lang] || collection.description?.en || ''
  const logsCount = collection.logsCount ?? collection.logs?.length ?? 0

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-all duration-200">
      {/* Main Card Content - 整个区域可点击 */}
      <div
        className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggleExpand()
          }
        }}
        aria-label={`${collectionName} - ${
          isExpanded ? 'Collapse' : 'Expand'
        } article list`}
      >
        {/* 上层容器：内容展示区域 */}
        <div className="flex items-center gap-4">
          {/* 左侧：封面图 */}
          <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-muted">
            {collection.coverImageUrl ? (
              <Image
                src={collection.coverImageUrl}
                alt={collectionName}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <div className="text-muted-foreground text-caption-xs">
                  No Image
                </div>
              </div>
            )}
          </div>

          {/* 右侧：标题和描述（垂直排列，横向拓展） */}
          <div className="flex-1 min-w-0">
            {/* 标题在上 */}
            <h3 className="text-display-sm text-foreground py-1 line-clamp-1">
              {collectionName}
            </h3>

            {/* 描述在下，横向拓展利用右侧空间 */}
            {collectionDescription && (
              <p
                className={`text-body-base text-muted-foreground max-w-2xl py-1 ${
                  isExpanded ? '' : 'line-clamp-2'
                }`}
              >
                {collectionDescription}
              </p>
            )}

            {/* Featured 标签 */}
            {collection.isFeatured && (
              <div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-caption-xs font-medium bg-primary/10 text-primary">
                  Featured
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 下层容器：文章数量靠右显示 */}
        <div className="flex justify-end mb-1">
          <div className="flex items-center gap-2">
            <span className="text-body-sm text-muted-foreground whitespace-nowrap">
              {logsCount} {dictionary.develop.logsCount}
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 inline ml-1 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 inline ml-1 text-muted-foreground" />
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Content - Log List */}
      {isExpanded && collection.logs && collection.logs.length > 0 && (
        <div className="border-t border-border bg-muted/85 dark:bg-muted/60">
          <div className="p-4 space-y-2">
            <div className="space-y-1">
              {collection.logs?.map((log) => (
                <Link
                  key={log._id}
                  href={`/${lang}/log/${log.slug}`}
                  className="block group"
                >
                  <div className="flex items-start gap-3 p-1 rounded-md hover:bg-background/80 dark:hover:bg-background/60 transition-colors border border-transparent hover:border-border/50">
                    <div className="w-1.5 h-1.5 bg-blue-500/70 rounded-full flex-shrink-0 mt-2" />
                    <div className="flex-1 min-w-0 max-w-prose">
                      <p className="text-body-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {log.title}
                      </p>
                      {/* {log.excerpt && (
                        <p className="text-body-sm text-muted-foreground mt-1 line-clamp-2">
                          {log.excerpt}
                        </p>
                      )}
                      {log.publishedAt && (
                        <p className="text-caption-xs text-muted-foreground mt-1">
                          {new Date(log.publishedAt).toLocaleDateString(
                            lang === 'zh' ? 'zh-CN' : 'en-US'
                          )}
                        </p>
                      )} */}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State for Expanded Collection with No Logs */}
      {isExpanded && (!collection.logs || collection.logs.length === 0) && (
        <div className="border-t border-border bg-muted/50 dark:bg-muted/30">
          <div className="p-4 text-center">
            <p className="text-body-sm text-muted-foreground">
              {dictionary.develop.noArticlesInCollection}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// app/ui/log-page-shell.tsx
'use client'

import { useState } from 'react'
import { type DevCollection } from '@/types/sanity'
import { type Locale } from '@/i18n-config'
import { type getDictionary } from '@/lib/dictionary'
import { DevCollectionListCard } from './dev-collection-list-card'

type DictionaryType = Awaited<ReturnType<typeof getDictionary>>

interface LogPageShellProps {
  collections: DevCollection[]
  lang: Locale
  dictionary: DictionaryType
}

export function LogPageShell({
  collections,
  lang,
  dictionary,
}: LogPageShellProps) {
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(
    new Set()
  )
  const [isAllExpanded, setIsAllExpanded] = useState(false)

  const toggleCollection = (collectionId: string) => {
    const newExpanded = new Set(expandedCollections)
    if (newExpanded.has(collectionId)) {
      newExpanded.delete(collectionId)
    } else {
      newExpanded.add(collectionId)
    }
    setExpandedCollections(newExpanded)

    // Update all expanded state
    setIsAllExpanded(newExpanded.size === collections.length)
  }

  const toggleAllCollections = () => {
    if (isAllExpanded) {
      setExpandedCollections(new Set())
      setIsAllExpanded(false)
    } else {
      setExpandedCollections(new Set(collections.map((c) => c._id)))
      setIsAllExpanded(true)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-display-md text-foreground mb-4">
          {dictionary.develop.title}
        </h1>
        <p className="text-body-md text-muted-foreground max-w-2xl mx-auto">
          {dictionary.develop.description}
        </p>
      </div>

      {/* Collections List */}
      {collections.length > 0 ? (
        <div className="max-w-4xl mx-auto">
          {/* Batch Controls */}
          <div className="flex items-center justify-between mb-2 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="expand-all"
                checked={isAllExpanded}
                onChange={toggleAllCollections}
                className="w-3 h-3 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
              />
              <label
                htmlFor="expand-all"
                className="text-label-sm font-normal text-muted-foreground"
              >
                {isAllExpanded
                  ? dictionary.develop.collapseAll
                  : dictionary.develop.expandAll}
              </label>
            </div>
            {/* <div className="text-body-sm text-muted-foreground">
              {collections.length} {dictionary.develop.collections}
            </div> */}
          </div>

          {/* Collections List */}
          <div className="space-y-4">
            {collections.map((collection) => (
              <DevCollectionListCard
                key={collection._id}
                collection={collection}
                lang={lang}
                dictionary={dictionary}
                isExpanded={expandedCollections.has(collection._id)}
                onToggleExpand={() => toggleCollection(collection._id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-display-sm text-muted-foreground mb-2">
            {dictionary.develop.noCollections}
          </h3>
          <p className="text-body-md text-muted-foreground">
            {dictionary.develop.noCollectionsDescription}
          </p>
        </div>
      )}
    </div>
  )
}

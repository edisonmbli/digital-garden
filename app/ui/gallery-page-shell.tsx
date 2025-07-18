// app/ui/gallery-page-shell.tsx
import { placeholderGroups } from '@/lib/placeholder-data'

export function GalleryPageShell() {
  return (
    <div className="container py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {placeholderGroups.map((group) => (
          <div
            key={group.slug}
            className="h-80 rounded-lg bg-muted flex items-center justify-center"
          >
            <h2 className="text-2xl font-bold">{group.name}</h2>
          </div>
        ))}
      </div>
    </div>
  )
}

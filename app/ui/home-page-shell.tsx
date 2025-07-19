import { Button } from '@/components/ui/button'
import { getDictionary } from '@/lib/dictionary'

type DictionaryType = Awaited<ReturnType<typeof getDictionary>>

export async function HomePageShell({
  dictionary,
}: {
  dictionary: DictionaryType
}) {
  return (
    <div className="w-full py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative h-[calc(100vh-16rem)] flex flex-col items-center justify-center text-center rounded-lg bg-muted/50">
          {/* 背景效果 - 现在只应用在容器内 */}
          {/* 在第六章，这里会变成一个背景图/视频 */}
          <div className="absolute inset-0 bg-black/30 rounded-lg" />
          <div className="relative max-w-4xl mx-auto px-4">
            <h1 className="text-5xl font-bold tracking-tighter sm:text-7xl">
              {dictionary.homepage.title}
            </h1>
            <p className="mx-auto mt-4 max-w-[700px] text-lg text-muted-foreground">
              {dictionary.homepage.description}
            </p>
            <div className="mt-8">
              <Button size="lg">{dictionary.homepage.enter_button}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

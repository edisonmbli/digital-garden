import Image from 'next/image'
import { PortableTextRenderer } from './portable-text-renderer'
import { SocialIcons } from './social-icons'
import type { Author } from '@/types/sanity'
import type { Locale } from '@/i18n-config'
import { getDictionary } from '@/lib/dictionary'
import { AboutPageTracker } from '@/app/ui/about-page-tracker'

interface AboutPageContentProps {
  author: Author
  lang: Locale
}





export async function AboutPageContent({ author, lang }: AboutPageContentProps) {
  const dictionary = await getDictionary(lang)
  const bioContent = author.bio[lang] || author.bio.en || []

  if (!bioContent || bioContent.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-slate-600 dark:text-slate-400">
          {dictionary.about.noBioContent}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background bg-gradient-to-br from-background via-background/95 to-background/90">
      <AboutPageTracker 
        lang={lang} 
        authorName={author.name}
        hasSocialLinks={author.socialLinks && author.socialLinks.length > 0}
      />
      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Row 1: 页面标题和分隔线 */}
        <div className="space-y-2 mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-slate-100 dark:via-slate-300 dark:to-slate-100 bg-clip-text text-transparent">
{dictionary.about.title}
          </h1>
          <div className="flex items-center space-x-4">
            <div className="w-32 h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 rounded-full"></div>
            <div className="w-8 h-1 bg-gradient-to-r from-blue-400 to-blue-300 rounded-full"></div>
            <div className="w-4 h-1 bg-gradient-to-r from-blue-300 to-blue-200 rounded-full"></div>
          </div>
        </div>

        {/* Row 2: 两列布局容器 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
          {/* 左列：简介内容 */}
          <div className="lg:col-span-2 space-y-8">
            <div className="prose prose-lg prose-slate dark:prose-invert max-w-none">
              <div className="bg-white/70 dark:bg-neutral-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-200/50 dark:border-neutral-700/50">
                {bioContent.length > 0 ? (
                  <PortableTextRenderer content={bioContent} />
                ) : (
                  <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                    {lang === 'zh'
                      ? '暂无简介内容。'
                      : 'No bio content available.'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 右列：头像和社交链接 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 头像区域 */}
            {author.imageUrl && (
              <div className="relative group">
                {/* 3:2 比例的照片容器 */}
                <div className="aspect-[3/2] relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 shadow-2xl">
                  <Image
                    src={author.imageUrl}
                    alt={`${author.name} - Profile Photo`}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority
                  />
                  {/* 渐变遮罩 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>

                {/* 装饰性光晕效果 */}
                <div className="absolute -inset-6 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-[2.5rem] -z-10 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* 装饰性边框 */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 rounded-[1.75rem] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            )}

            {/* 社交链接 - 精简版 */}
            {author.socialLinks && author.socialLinks.length > 0 && (
              <div className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-slate-200/50 dark:border-neutral-700/50 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-neutral-800 dark:to-neutral-700 hover:from-blue-200/30 hover:to-blue-100/30 dark:hover:from-slate-800 dark:hover:to-slate-600">
                <SocialIcons
                  socialLinks={author.socialLinks}
                  lang={lang}
                  dictionary={dictionary.about}
                />
              </div>
            )}
          </div>
        </div>
      </div>


    </div>
  )
}

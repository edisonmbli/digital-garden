// app/ui/log-page-shell.tsx
import Link from 'next/link'
import { getDictionary } from '@/lib/dictionary'
import type { LogPost } from '@/types/sanity'
import type { Locale } from '@/i18n-config'

type DictionaryType = Awaited<ReturnType<typeof getDictionary>>

interface LogPageShellProps {
  dictionary: DictionaryType
  posts: LogPost[]
  lang: Locale
}

export function LogPageShell({ dictionary, posts, lang }: LogPageShellProps) {
  // 格式化日期的辅助函数
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="w-full py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题区域 */}
        <div className="text-center mb-12">
          <h1 className="text-display-sm md:text-display-md font-display font-semibold tracking-tight text-foreground">
            {dictionary.develop.title}
          </h1>
          <p className="text-body-lg font-sans text-muted-foreground mt-6 leading-relaxed">
            {dictionary.develop.description}
          </p>
          {/* 未来这里的搜索/筛选区 */}
        </div>

        {/* 文章列表区域 - 限制最大宽度 */}
        <div className="max-w-4xl mx-auto">
          {posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map((post) => (
                <Link
                  key={post._id}
                  href={`/${lang}/log/${post.slug}`}
                  className="group block"
                >
                  <article className="p-6 border border-border rounded-lg transition-all duration-200 hover:border-border/80 hover:shadow-md hover:bg-muted/30">
                    {/* 标题和日期区域 - 响应式布局 */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-3">
                      {/* 文章标题 */}
                      <h2 className="text-heading-md font-display font-medium group-hover:text-primary transition-colors sm:flex-1 tracking-tight">
                        {post.title}
                      </h2>

                      {/* 发布日期 - 响应式位置 */}
                      <time
                        dateTime={post.publishedAt}
                        className="text-label-sm font-sans text-muted-foreground mt-1 sm:mt-0 sm:text-right sm:flex-shrink-0"
                      >
                        {formatDate(post.publishedAt)}
                      </time>
                    </div>

                    {/* 文章摘要 */}
                    {post.excerpt && (
                      <p className="text-body-md font-sans text-muted-foreground leading-relaxed">
                        {post.excerpt}
                      </p>
                    )}
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            /* 空状态 */
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <svg
                  className="mx-auto h-12 w-12 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-heading-sm font-display font-medium text-foreground mb-2">
                No posts yet
              </h3>
              <p className="text-body-md font-sans text-muted-foreground">
                Check back later for new developer log entries.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { PortableTextRenderer, HeadingItem } from './portable-text-renderer'
import { TableOfContents } from './table-of-contents'
import { EnhancedLikeButton } from './enhanced-like-button'
import EnhancedCommentButton from './enhanced-comment-button'
import CommentForm from './comment-form'
import { CommentList } from '@/app/ui/comment-list'
import AuthModal from '@/app/ui/auth-modal'
import { FloatingActionMenu } from '@/app/ui/floating-action-menu'
import { SelfPromotionCard } from '@/app/ui/self-promotion-card'
import { ProtectedContent } from '@/app/ui/protected-content'
import { CopyrightNotice } from '@/app/ui/copyright-notice'

import { type EnrichedLogPost } from '@/types/sanity'
import { type Locale } from '@/i18n-config'

interface CopyrightData {
  title?: string
  content?: string
  minimal?: string
}

interface LogDetailPageProps {
  enrichedLogPost: EnrichedLogPost
  allLogsInCollection: Array<{
    _id: string
    title: string
    slug: string
    publishedAt: string
  }>
  currentLogSlug: string
  collection: {
    name: string | Record<string, string>
  } | null
  dictionary: {
    develop: {
      title: string
      publishedOn: string
      by: string
    }
    common?: {
      tableOfContents?: string
    }
  }
  lang: Locale
  translationMap: Record<string, string>
  copyrightData?: CopyrightData
}

export function LogDetailPage({
  enrichedLogPost,
  allLogsInCollection,
  currentLogSlug,
  collection,
  dictionary,
  lang,
  translationMap,
  copyrightData,
}: LogDetailPageProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([])

  // 评论系统状态
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [showCommentSubmittedMessage, setShowCommentSubmittedMessage] =
    useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const commentFormRef = useRef<HTMLDivElement>(null)

  // 悬浮菜单状态
  const [showMobileOutline, setShowMobileOutline] = useState(false)

  // 处理从 PortableTextRenderer 提取的标题
  const handleHeadingsExtracted = useCallback(
    (extractedHeadings: HeadingItem[]) => {
      setHeadings(extractedHeadings)
    },
    []
  )

  // 处理需要认证的情况
  const handleAuthRequired = useCallback(() => {
    setShowAuthModal(true)
  }, [])

  // 处理评论按钮点击
  const handleCommentClick = useCallback(() => {
    setShowCommentForm(true)
    // 滚动到评论表单
    setTimeout(() => {
      commentFormRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 100)
  }, [])

  // 悬浮菜单回调函数
  const handleToggleOutline = useCallback(() => {
    setShowMobileOutline(!showMobileOutline)
  }, [showMobileOutline])

  const handleScrollToComments = useCallback(() => {
    // 统一的评论交互逻辑：展开表单 -> 滚动到位置
    setShowCommentForm(true)

    // 延迟滚动，确保表单已经展开
    setTimeout(() => {
      commentFormRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 100)
  }, [])

  const handleScrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleFloatingLike = useCallback(() => {
    // 触发点赞按钮的点击事件
    const likeButton = document.querySelector(
      '[data-testid="like-button"]'
    ) as HTMLButtonElement
    if (likeButton) {
      likeButton.click()
    }
  }, [])

  // 左侧导航内容
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* 上方内容区域 */}
      <div className="flex-shrink-0 space-y-2">
        {/* 面包屑导航 */}
        <nav className="space-y-2">
          <Link
            href={`/${lang}/log`}
            className="text-body-sm text-muted-foreground hover:text-primary transition-colors block"
          >
            ← {dictionary.develop.title}
          </Link>
        </nav>
        {/* 合集名称 */}
        {collection && (
          <div className="text-body-base pt-10 font-medium text-foreground">
            {typeof collection.name === 'string'
              ? collection.name
              : (collection.name as Record<string, string>)?.[lang] ||
                (collection.name as Record<string, string>)?.en ||
                'Collection'}
          </div>
        )}
        {/* 合集中的所有文章 */}
        {allLogsInCollection && allLogsInCollection.length > 0 && (
          <div>
            <div className="space-y-2">
              {allLogsInCollection.map(
                (log: {
                  _id: string
                  title: string
                  slug: string
                  publishedAt: string
                }) => {
                  const isCurrentLog = log.slug === currentLogSlug
                  return (
                    <Link
                      key={log._id}
                      href={`/${lang}/log/${log.slug}`}
                      className={`block px-2 py-1 rounded-md transition-colors ${
                        isCurrentLog
                          ? 'bg-primary/10 text-primary font-semibold border border-primary/20'
                          : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
                      }`}
                    >
                      <div
                        className={`text-body-sm line-clamp-2 ${isCurrentLog ? 'font-medium' : 'font-base'}`}
                      >
                        {log.title}
                      </div>
                    </Link>
                  )
                }
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* 弹性空间 */}
      <div className="flex-grow"></div>
      
      {/* 底部自推广卡片 */}
      <div className="flex-shrink-0">
        <SelfPromotionCard
          imageUrl={enrichedLogPost.mainImageUrl}
          lang={lang}
        />
      </div>
    </div>
  )

  // 右侧目录内容
  const TableOfContentsContent = () => (
    <div className="space-y-4">
      <TableOfContents
        headings={headings}
        title={dictionary.common?.tableOfContents || '目录'}
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex gap-8">
          {/* 左侧导航 - 桌面端 */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto bg-background/95 backdrop-blur-sm">
              <div className="p-2 h-full">
                <SidebarContent />
              </div>
            </div>
          </aside>

          {/* 主要内容区域 */}
          <main className="flex-1 min-w-0 py-8 lg:py-12">
            <article className="max-w-3xl mx-auto">
              {/* 文章标题 */}
              <header className="mb-8 text-center">
                <h1 className="text-display-sm md:text-display-md text-foreground mb-4">
                  {enrichedLogPost.title}
                </h1>
                <div className="text-body-sm text-muted-foreground space-x-4">
                  <span>
                    {dictionary.develop.publishedOn}{' '}
                    {new Date(enrichedLogPost.publishedAt).toLocaleDateString(
                      lang,
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }
                    )}
                  </span>
                  {enrichedLogPost.author && (
                    <span>
                      {dictionary.develop.by} {enrichedLogPost.author.name}
                    </span>
                  )}
                </div>
              </header>

              {/* 文章内容 */}
              <ProtectedContent showWatermark={true}>
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <PortableTextRenderer
                    content={enrichedLogPost.content}
                    onHeadingsExtracted={handleHeadingsExtracted}
                  />
                </div>
              </ProtectedContent>

              {/* 版权声明 */}
              <div className="mt-16">
                <CopyrightNotice 
                  contentType="tutorial" 
                  variant="default" 
                  copyrightData={copyrightData}
                />
              </div>

              {/* 交互区域 */}
              <section className="mt-2 pt-8 border-t border-border">
                {/* 点赞和评论按钮 */}
                {enrichedLogPost.post && (
                  <div className="flex items-center justify-end space-x-3 mb-6">
                    <EnhancedLikeButton
                      postId={enrichedLogPost.post.id}
                      initialLikes={enrichedLogPost.post.likesCount}
                      isLikedByUser={enrichedLogPost.post.isLikedByUser}
                      onAuthRequired={handleAuthRequired}
                      variant="default"
                      className="justify-center"
                    />
                    <EnhancedCommentButton
                      commentCount={enrichedLogPost.post.commentsCount}
                      hasUserCommented={
                        enrichedLogPost.post.hasUserCommented || false
                      }
                      onCommentClick={handleCommentClick}
                      onAuthRequired={handleAuthRequired}
                      variant="default"
                      className="justify-center"
                    />
                  </div>
                )}

                {/* 评论提交成功提示 */}
                {showCommentSubmittedMessage && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-body-sm text-center rounded-md">
                    评论已提交，审核后可对外展示
                  </div>
                )}

                {/* 评论表单 - 可展开/收起 */}
                {showCommentForm && enrichedLogPost.post && (
                  <div ref={commentFormRef} className="mb-6 space-y-3">
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCommentForm(false)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex-1">
                        <CommentForm
                          postId={enrichedLogPost.post.id}
                          compact={true}
                          onSubmitSuccess={() => {
                            setShowCommentForm(false)
                            setShowCommentSubmittedMessage(true)
                            // 3秒后自动隐藏提示
                            setTimeout(() => {
                              setShowCommentSubmittedMessage(false)
                            }, 3000)
                          }}
                          onAuthRequired={handleAuthRequired}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 评论列表 - 只在有评论时显示 */}
                {enrichedLogPost.post &&
                  enrichedLogPost.post.commentsCount > 0 && (
                    <div className="space-y-3">
                      <CommentList postId={enrichedLogPost.post.id} />
                    </div>
                  )}

                {/* 当没有评论且没有展开评论表单时，显示引导信息 */}
                {enrichedLogPost.post &&
                  enrichedLogPost.post.commentsCount === 0 &&
                  !showCommentForm && (
                    <div className="flex items-center justify-center py-8 text-center text-muted-foreground">
                      <p className="text-body-sm">还没有评论，来说点什么吧</p>
                    </div>
                  )}
              </section>
            </article>
          </main>

          {/* 右侧目录 - 桌面端 */}
          <aside className="hidden xl:block w-64 shrink-0">
            <div className="sticky top-8">
              {/* 偏移对齐：*/}
              <div className="pt-20 pb-8">
                <TableOfContentsContent />
              </div>
              {/* 推广卡片放在sticky容器内的底部 */}
              {/* <SelfPromotionCard
                imageUrl={enrichedLogPost.mainImageUrl}
                lang={lang}
              /> */}
            </div>
          </aside>
        </div>
      </div>

      {/* 隐藏的翻译数据，供语言切换器使用 */}
      <script
        type="application/json"
        id="translation-map"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(translationMap),
        }}
      />

      {/* 认证模态框 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* 移动端大纲模态框 */}
      {showMobileOutline && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 md:hidden">
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-display-xs">
                {dictionary.common?.tableOfContents || '目录'}
              </h3>
              <Button
                onClick={() => setShowMobileOutline(false)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <TableOfContents
              headings={headings}
              title=""
              onItemClick={() => setShowMobileOutline(false)}
            />
          </div>
        </div>
      )}

      {/* 移动端悬浮操作菜单 */}
      {enrichedLogPost.post && (
        <FloatingActionMenu
          onToggleOutline={handleToggleOutline}
          onScrollToComments={handleScrollToComments}
          onScrollToTop={handleScrollToTop}
          onLike={handleFloatingLike}
          likesCount={enrichedLogPost.post.likesCount}
          commentsCount={enrichedLogPost.post.commentsCount}
          isLiked={enrichedLogPost.post.isLikedByUser}
        />
      )}
    </div>
  )
}

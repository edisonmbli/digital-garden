'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X, Heart, MessageCircle, List, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingActionMenuProps {
  onToggleOutline: () => void
  onScrollToComments: () => void
  onScrollToTop: () => void
  onLike: () => void
  likesCount: number
  commentsCount: number
  isLiked: boolean
  className?: string
}

export function FloatingActionMenu({
  onToggleOutline,
  onScrollToComments,
  onScrollToTop,
  onLike,
  likesCount,
  commentsCount,
  isLiked,
  className,
}: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showScrollToTop, setShowScrollToTop] = useState(false)

  // 监听滚动，决定是否显示回到顶部按钮
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollToTop(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const handleAction = (action: () => void) => {
    action()
    setIsOpen(false) // 执行操作后关闭菜单
  }

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 md:hidden', // 只在移动端显示
        className
      )}
    >
      {/* 展开的菜单项 */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 flex flex-col space-y-3 mb-2">
          {/* 章节大纲 */}
          <Button
            onClick={() => handleAction(onToggleOutline)}
            size="sm"
            variant="secondary"
            className="w-12 h-12 rounded-full shadow-lg bg-background border border-border hover:bg-accent"
          >
            <List className="h-5 w-5" />
            <span className="sr-only">章节大纲</span>
          </Button>

          {/* 评论 */}
          <Button
            onClick={() => handleAction(onScrollToComments)}
            size="sm"
            variant="secondary"
            className="w-12 h-12 rounded-full shadow-lg bg-background border border-border hover:bg-accent relative"
          >
            <MessageCircle className="h-5 w-5" />
            {commentsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-caption-xs rounded-full w-5 h-5 flex items-center justify-center">
                {commentsCount > 99 ? '99+' : commentsCount}
              </span>
            )}
            <span className="sr-only">评论 ({commentsCount})</span>
          </Button>

          {/* 点赞 */}
          <Button
            onClick={() => handleAction(onLike)}
            size="sm"
            variant="secondary"
            className={cn(
              'w-12 h-12 rounded-full shadow-lg border border-border hover:bg-accent relative',
              isLiked
                ? ' text-red-500 hover:bg-red-100'
                : 'bg-background hover:bg-accent'
            )}
          >
            <Heart className={cn('h-5 w-5', isLiked && 'fill-current')} />
            {likesCount > 0 && (
              <span
                className={cn(
                  'absolute -top-1 -right-1 text-caption-xs rounded-full w-5 h-5 flex items-center justify-center',
                  isLiked
                    ? 'bg-red-600 text-white'
                    : 'bg-primary text-primary-foreground'
                )}
              >
                {likesCount > 99 ? '99+' : likesCount}
              </span>
            )}
            <span className="sr-only">点赞 ({likesCount})</span>
          </Button>

          {/* 回到顶部 - 只在滚动时显示 */}
          {showScrollToTop && (
            <Button
              onClick={() => handleAction(onScrollToTop)}
              size="sm"
              variant="secondary"
              className="w-12 h-12 rounded-full shadow-lg bg-background border border-border hover:bg-accent"
            >
              <ArrowUp className="h-5 w-5" />
              <span className="sr-only">回到顶部</span>
            </Button>
          )}
        </div>
      )}

      {/* 主菜单按钮 */}
      <Button
        onClick={toggleMenu}
        size="lg"
        className={cn(
          'w-14 h-14 rounded-full shadow-lg transition-all duration-200',
          isOpen
            ? 'bg-primary text-primary-foreground rotate-180'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        <span className="sr-only">{isOpen ? '关闭菜单' : '打开菜单'}</span>
      </Button>
    </div>
  )
}

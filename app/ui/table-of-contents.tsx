'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { HeadingItem } from './portable-text-renderer'

interface TableOfContentsProps {
  headings: HeadingItem[]
  title?: string
  className?: string
  onItemClick?: () => void
  excludeH1?: boolean
}

export function TableOfContents({
  headings,
  title = '目录',
  className,
  onItemClick,
  excludeH1 = false,
}: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')
  const displayHeadings = excludeH1
    ? headings.filter((h) => h.level !== 1)
    : headings

  useEffect(() => {
    if (!displayHeadings.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        // 找到所有正在相交的元素
        const visibleEntries = entries.filter((entry) => entry.isIntersecting)

        if (visibleEntries.length > 0) {
          // 选择最靠近顶部的元素
          const topEntry = visibleEntries.reduce((prev, current) => {
            return current.boundingClientRect.top < prev.boundingClientRect.top
              ? current
              : prev
          })
          setActiveId(topEntry.target.id)
        } else {
          // 如果没有可见元素，检查是否滚动到了底部
          const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop
          const windowHeight = window.innerHeight
          const documentHeight = document.documentElement.scrollHeight

          // 如果滚动到接近底部（距离底部小于100px），激活最后一个标题
          if (documentHeight - (scrollTop + windowHeight) < 100) {
            const lastHeading = displayHeadings[displayHeadings.length - 1]
            if (lastHeading) {
              setActiveId(lastHeading.id)
            }
          }
        }
      },
      {
        rootMargin: '-80px 0px -40%', // 调整底部边距，让最后一个标题更容易被激活
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      }
    )

    // 观察所有标题元素
    const elements: Element[] = []
    displayHeadings.forEach((heading) => {
      const element = document.getElementById(heading.id)
      if (element) {
        elements.push(element)
        observer.observe(element)
      }
    })

    // 添加滚动事件监听器来处理边界情况
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      // 如果滚动到接近底部，激活最后一个标题
      if (documentHeight - (scrollTop + windowHeight) < 50) {
        const lastHeading = displayHeadings[displayHeadings.length - 1]
        if (lastHeading && activeId !== lastHeading.id) {
          setActiveId(lastHeading.id)
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    // 如果没有活动标题，设置第一个可见的标题为活动状态
    if (!activeId && elements.length > 0) {
      const firstVisibleElement = elements.find((el) => {
        const rect = el.getBoundingClientRect()
        return rect.top >= 0 && rect.top <= window.innerHeight
      })
      if (firstVisibleElement) {
        setActiveId(firstVisibleElement.id)
      }
    }

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [displayHeadings, activeId])

  const handleClick = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      // 计算偏移量，考虑固定头部的高度
      const yOffset = -100
      const y =
        element.getBoundingClientRect().top + window.pageYOffset + yOffset

      window.scrollTo({
        top: y,
        behavior: 'smooth',
      })

      // 立即更新活动状态
      setActiveId(id)

      // 调用回调函数（如果提供）
      onItemClick?.()
    }
  }

  if (!displayHeadings.length) {
    return null
  }

  return (
    <nav className={cn('space-y-2', className)}>
      <h4 className="text-body-md font-semibold text-foreground mb-3">{title}</h4>
      <ul className="space-y-1">
        {displayHeadings.map((heading) => (
          <li key={heading.id}>
            <button
              onClick={() => handleClick(heading.id)}
              className={cn(
                'block w-full text-left text-sm transition-colors hover:text-foreground',
                'py-1 px-2 rounded-sm',
                {
                  'text-foreground bg-muted bg-gray-200 dark:bg-gray-400/30':
                    activeId === heading.id,
                  'text-muted-foreground': activeId !== heading.id,
                  'pl-2': heading.level === 1,
                  'pl-4': heading.level === 2,
                  'pl-6': heading.level === 3,
                  'pl-8': heading.level === 4,
                  'pl-10': heading.level === 5,
                  'pl-12': heading.level === 6,
                }
              )}
            >
              {heading.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

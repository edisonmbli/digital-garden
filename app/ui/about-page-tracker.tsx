'use client'

import { useEffect } from 'react'
import { analytics } from '@/lib/analytics-logger'
import type { Locale } from '@/i18n-config'

interface AboutPageTrackerProps {
  lang: Locale
  authorName?: string
  hasSocialLinks?: boolean
}

export function AboutPageTracker({ lang, authorName, hasSocialLinks }: AboutPageTrackerProps) {
  useEffect(() => {
    // 追踪关于页面浏览
    analytics.trackPageView(`/${lang}/about`, {
      pageType: 'about',
      language: lang,
      authorName,
      hasSocialLinks,
      hasAuthorImage: true // 假设总是有作者图片
    })
  }, [lang, authorName, hasSocialLinks])

  return null // 这是一个纯追踪组件，不渲染任何内容
}
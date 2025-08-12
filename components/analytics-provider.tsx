'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { useAnalyticsUser } from '@/hooks/use-analytics-user'

interface AnalyticsProviderProps {
  children: React.ReactNode
}

/**
 * Analytics Provider Component
 * 
 * This component provides comprehensive analytics coverage:
 * 1. Custom analytics with user tracking (via useAnalyticsUser)
 * 2. Vercel Analytics for UV/PV tracking
 * 3. Vercel Speed Insights for performance monitoring
 * 
 * Performance optimizations:
 * - Only runs on client side (marked with 'use client')
 * - Uses conditional rendering to avoid hydration issues
 * - Minimal overhead - just syncs user ID, doesn't affect SSG
 */
function AnalyticsSync() {
  useAnalyticsUser()
  return (
    <>
      {/* Vercel Analytics for UV/PV tracking */}
      <Analytics />
      {/* Vercel Speed Insights for performance monitoring */}
      <SpeedInsights />
    </>
  )
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const [isMounted, setIsMounted] = useState(false)
  
  // Ensure this only runs on client side to avoid hydration issues
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  return (
    <>
      {/* Only render analytics sync after component is mounted to avoid SSR issues */}
      {isMounted && <AnalyticsSync />}
      {children}
    </>
  )
}
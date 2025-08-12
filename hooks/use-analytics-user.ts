'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect } from 'react'
import { analytics } from '@/lib/analytics-logger'

/**
 * Hook to automatically sync Clerk user ID with analytics logger
 * 
 * This hook should be used in the root layout or a high-level component
 * to ensure user ID is available for all analytics events
 */
export function useAnalyticsUser() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (isLoaded) {
      // Set user ID in analytics logger when user state changes
      analytics.setUserId(user?.id)
      
      // If user just signed in, track the identify event
      if (user?.id) {
        analytics.identify(user.id, {
          email: user.primaryEmailAddress?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          createdAt: user.createdAt?.toISOString(),
          lastSignInAt: user.lastSignInAt?.toISOString(),
        })
      }
    }
  }, [user?.id, isLoaded])

  return {
    userId: user?.id,
    isLoaded,
    user
  }
}
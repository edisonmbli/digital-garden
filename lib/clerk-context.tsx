'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

interface ClerkContextualConfig {
  signIn?: {
    start?: {
      subtitle?: string
    }
  }
}

interface ClerkLocalization {
  signIn?: {
    start?: {
      title?: string
      subtitle?: string
    }
  }
  [key: string]: unknown
}

interface ClerkContextValue {
  contextualConfig: ClerkContextualConfig
  setContextualConfig: (config: ClerkContextualConfig) => void
  mergeWithBaseLocalization: (baseLocalization: ClerkLocalization) => ClerkLocalization
}

const ClerkContext = createContext<ClerkContextValue | undefined>(undefined)

export function ClerkContextProvider({ children }: { children: React.ReactNode }) {
  const [contextualConfig, setContextualConfig] = useState<ClerkContextualConfig>({})

  const mergeWithBaseLocalization = useCallback((baseLocalization: ClerkLocalization): ClerkLocalization => {
    if (!contextualConfig.signIn?.start?.subtitle) {
      return baseLocalization
    }

    return {
      ...baseLocalization,
      signIn: {
        ...baseLocalization.signIn,
        start: {
          ...baseLocalization.signIn?.start,
          subtitle: contextualConfig.signIn.start.subtitle
        }
      }
    }
  }, [contextualConfig])

  return (
    <ClerkContext.Provider value={{
      contextualConfig,
      setContextualConfig,
      mergeWithBaseLocalization
    }}>
      {children}
    </ClerkContext.Provider>
  )
}

export function useClerkContext() {
  const context = useContext(ClerkContext)
  if (context === undefined) {
    throw new Error('useClerkContext must be used within a ClerkContextProvider')
  }
  return context
}

// 预定义的上下文配置
export const CLERK_CONTEXTS = {
  LIKE_PHOTO: 'likePhoto',
  DEFAULT: 'default'
} as const

export type ClerkContextType = typeof CLERK_CONTEXTS[keyof typeof CLERK_CONTEXTS]
'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { ClerkContextProvider, useClerkContext } from '@/lib/clerk-context'
import { useEffect, useState } from 'react'

interface ClerkLocalization {
  signIn?: {
    start?: {
      title?: string
      subtitle?: string
    }
  }
  [key: string]: unknown
}

interface DynamicClerkProviderProps {
  children: React.ReactNode
  baseLocalization: ClerkLocalization
  contextualLocalization: {
    clerkContextual?: {
      signIn?: {
        likePhoto?: {
          subtitle?: string
        }
      }
    }
  }
}

function ClerkProviderInner({ children, baseLocalization, contextualLocalization }: DynamicClerkProviderProps) {
  const { mergeWithBaseLocalization, contextualConfig, setContextualConfig } = useClerkContext()
  const [currentLocalization, setCurrentLocalization] = useState(baseLocalization)

  useEffect(() => {
    const merged = mergeWithBaseLocalization(baseLocalization)
    setCurrentLocalization(merged)
  }, [baseLocalization, mergeWithBaseLocalization, contextualConfig])

  // 监听URL参数变化，设置上下文
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const context = urlParams.get('clerk_context')
    
    if (context === 'likePhoto' && contextualLocalization.clerkContextual?.signIn?.likePhoto?.subtitle) {
      setContextualConfig({
        signIn: {
          start: {
            subtitle: contextualLocalization.clerkContextual.signIn.likePhoto.subtitle
          }
        }
      })
    }
  }, [contextualLocalization, setContextualConfig])

  return (
    <ClerkProvider localization={currentLocalization}>
      {children}
    </ClerkProvider>
  )
}

export function DynamicClerkProvider({ children, baseLocalization, contextualLocalization }: DynamicClerkProviderProps) {
  return (
    <ClerkContextProvider>
      <ClerkProviderInner 
        baseLocalization={baseLocalization}
        contextualLocalization={contextualLocalization}
      >
        {children}
      </ClerkProviderInner>
    </ClerkContextProvider>
  )
}
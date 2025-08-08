'use client'

import { useState } from 'react'
import type { Locale } from '@/i18n-config'

interface EmailModalProps {
  isOpen: boolean
  onClose: () => void
  email: string
  lang: Locale
  dictionary: {
    contactEmail: string
    copied: string
    copy: string
    openEmail: string
    close: string
  }
}

export function EmailModal({
  isOpen,
  onClose,
  email,
  dictionary,
}: EmailModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 静默处理复制失败
    }
  }

  const handleOpenEmail = () => {
    window.location.href = `mailto:${email}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200/50 dark:border-neutral-700/50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-6 h-6 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {dictionary.contactEmail}
          </h3>

          <div className="bg-slate-50 dark:bg-neutral-700 rounded-lg p-3">
            <p className="text-sm font-mono text-slate-700 dark:text-slate-300 break-all">
              {email}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
            >
              {copied ? dictionary.copied : dictionary.copy}
            </button>
            <button
              onClick={handleOpenEmail}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
            >
              {dictionary.openEmail}
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm transition-colors duration-200"
          >
            {dictionary.close}
          </button>
        </div>
      </div>
    </div>
  )
}
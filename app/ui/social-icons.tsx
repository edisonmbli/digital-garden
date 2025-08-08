'use client'

import { useState } from 'react'
import { EmailModal } from './email-modal'
import type { Locale } from '@/i18n-config'

interface SocialLink {
  platform: string
  url: string
}

interface SocialIconsProps {
  socialLinks: SocialLink[]
  lang: Locale
  dictionary: {
    contactEmail: string
    copied: string
    copy: string
    openEmail: string
    close: string
  }
}

function SocialIcon({ platform }: { platform: string; url: string }) {
  switch (platform.toLowerCase()) {
    case 'email':
      return (
        <svg
          className="w-5 h-5"
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
      )
    case 'instagram':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      )
    case 'rednote':
    case 'redbook':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <rect
            x="1"
            y="1"
            width="22"
            height="22"
            rx="3"
            ry="3"
            fill="currentColor"
            className="text-slate-300/30 dark:text-slate-800 stroke-slate-600 dark:stroke-slate-300/60"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <text
            x="12"
            y="14.5"
            textAnchor="middle"
            fontSize="9"
            fontWeight="900"
            fill="currentColor"
            className="text-red-400 dark:text-red-500"
          >
            Red
          </text>
        </svg>
      )
    default:
      return (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      )
  }
}

export function SocialIcons({
  socialLinks,
  lang,
  dictionary,
}: SocialIconsProps) {
  const [emailModalOpen, setEmailModalOpen] = useState(false)

  const handleSocialClick = (link: { platform: string; url: string }) => {
    if (link.platform.toLowerCase() === 'email') {
      setEmailModalOpen(true)
    } else {
      window.open(link.url, '_blank', 'noopener,noreferrer')
    }
  }

  const emailLink = socialLinks.find(
    (link) => link.platform.toLowerCase() === 'email'
  )

  return (
    <>
      <div className="flex gap-3 justify-end">
        {socialLinks.map((link, index) => (
          <button
            key={index}
            onClick={() => handleSocialClick(link)}
            className="w-10 h-10 bg-slate-200/80 dark:bg-slate-800  rounded-lg flex items-center justify-center transition-colors duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            aria-label={`${link.platform} link`}
          >
            <SocialIcon platform={link.platform} url={link.url} />
          </button>
        ))}
      </div>

      {emailLink && (
        <EmailModal
          isOpen={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          email={emailLink.url}
          lang={lang}
          dictionary={dictionary}
        />
      )}
    </>
  )
}

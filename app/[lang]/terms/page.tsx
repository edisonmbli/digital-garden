// app/[lang]/terms/page.tsx
import { TermsOfUse } from '@/app/ui/terms-of-use'
import { getDictionary } from '@/lib/dictionary'
import { logger } from '@/lib/logger'
import { type Locale } from '@/i18n-config'
import { type Metadata } from 'next'

interface TermsPageProps {
  params: Promise<{
    lang: Locale
  }>
}

export async function generateMetadata({
  params,
}: TermsPageProps): Promise<Metadata> {
  const { lang } = await params
  const dict = await getDictionary(lang)

  return {
    title: dict.terms.title,
    description: dict.terms.subtitle,
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function TermsPage({ params }: TermsPageProps) {
  const { lang } = await params
  const dict = await getDictionary(lang)
  
  // 记录页面访问日志
  logger.info('Terms', 'Page accessed', { lang })

  return (
    <div className="min-h-screen bg-background">
      <TermsOfUse dictionary={dict} />
    </div>
  )
}
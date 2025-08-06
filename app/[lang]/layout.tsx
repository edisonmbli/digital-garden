import type { Metadata } from 'next'
import { Inter, Crimson_Pro, Playfair_Display, Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google'
import '@/app/ui/globals.css'
import { ThemeProvider } from '@/app/ui/theme-provider'
import { DynamicClerkProvider } from '@/components/dynamic-clerk-provider'
import { Header } from '@/app/ui/header'
import { Footer } from '@/app/ui/footer'
import { Toaster } from '@/components/ui/sonner'
import { getDictionary, getClerkLocalization } from '@/lib/dictionary'
import { type Locale, generateStaticParams } from '@/i18n-config'
import { I18nProvider } from '@/app/context/i18n-provider'
import { PageTransitionRecommended } from '@/app/ui/page-transition'
// 导入环境变量验证（仅在开发环境自动执行）
import '@/lib/env-validation'

// 英文字体配置
const fontSans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
})

const fontSerif = Crimson_Pro({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  weight: ['300', '400', '500', '600', '700'],
})

const fontDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '900'],
})

// 中文字体配置
const fontSansCN = Noto_Sans_SC({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans-cn',
  weight: ['300', '400', '500', '600', '700'],
})

const fontSerifCN = Noto_Serif_SC({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif-cn',
  weight: ['300', '400', '500', '600', '700', '900'],
})

// 动态生成metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>
}): Promise<Metadata> {
  const { lang } = await params
  const { generateBaseMetadata } = await import('@/lib/seo-utils')
  return generateBaseMetadata(lang)
}

// 确保根布局也导出了 generateStaticParams
export { generateStaticParams }

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: Locale }>
}) {
  // 在服务端获取所有需要的国际化资源
  const { lang } = await params
  const dictionary = await getDictionary(lang)
  const clerkLocalization = getClerkLocalization(lang)

  return (
    <DynamicClerkProvider 
      baseLocalization={{ ...clerkLocalization, ...dictionary.clerk }}
      contextualLocalization={dictionary}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${fontSans.variable} ${fontSerif.variable} ${fontDisplay.variable} ${fontSansCN.variable} ${fontSerifCN.variable} font-sans min-h-screen w-full bg-background text-foreground antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <I18nProvider dictionary={dictionary}>
              <div className="relative flex flex-col min-h-screen w-full">
                <Header lang={lang} dictionary={dictionary} />
                <main className="flex-1 w-full">
                  <PageTransitionRecommended>
                    {children}
                  </PageTransitionRecommended>
                </main>
                <Footer dictionary={dictionary} />
              </div>
            </I18nProvider>
            <Toaster richColors />
          </ThemeProvider>
        </body>
      </html>
    </DynamicClerkProvider>
  )
}

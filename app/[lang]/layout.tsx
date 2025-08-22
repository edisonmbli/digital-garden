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
import { AnalyticsProvider } from '@/components/analytics-provider'

// 导入环境变量验证（仅在开发环境自动执行）
import '@/lib/env-validation'

// 英文字体配置 - 使用 swap 确保视觉效果，但优化 Hydration 稳定性
const fontSans = Inter({
  subsets: ['latin'],
  display: 'swap', 
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
})



const fontSerif = Crimson_Pro({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  weight: ['300', '400', '500', '600', '700'],
  preload: true, 
  fallback: ['Georgia', 'Times New Roman', 'serif'],
})

const fontDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '900'],
  preload: true,
  fallback: ['Georgia', 'Times New Roman', 'serif'],
})

// 中文字体配置
const fontSansCN = Noto_Sans_SC({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans-cn',
  weight: ['300', '400', '500', '600', '700'],
  preload: true,
  fallback: ['PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif'],
})

const fontSerifCN = Noto_Serif_SC({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif-cn',
  weight: ['300', '400', '500', '600', '700', '900'],
  preload: true,
  fallback: ['Songti SC', 'SimSun', 'serif'],
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
  
  // 构建字体类名字符串
  const fontClasses = `${fontSans.variable} ${fontSerif.variable} ${fontDisplay.variable} ${fontSansCN.variable} ${fontSerifCN.variable}`

  return (
    <DynamicClerkProvider 
      baseLocalization={{ ...clerkLocalization, ...dictionary.clerk }}
      contextualLocalization={dictionary}
    >
      <html lang={lang} suppressHydrationWarning>
        <body
          className={`${fontClasses} font-sans min-h-screen w-full bg-background text-foreground antialiased`}
          suppressHydrationWarning

        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="theme"
          >
            <I18nProvider dictionary={dictionary}>
              <AnalyticsProvider>
  
                <div className="relative flex flex-col min-h-screen w-full">
                  <Header lang={lang} dictionary={dictionary} />
                  <main className="flex-1 w-full">
                    <PageTransitionRecommended>
                      {children}
                    </PageTransitionRecommended>
                  </main>
                  <Footer dictionary={dictionary} lang={lang} />
                </div>
              </AnalyticsProvider>
            </I18nProvider>
            <Toaster richColors />
          </ThemeProvider>
        </body>
      </html>
    </DynamicClerkProvider>
  )
}

import { ClerkProvider } from '@clerk/nextjs'
import { getDictionary } from '@/lib/dictionary'
import { type Locale } from '@/i18n-config'
import { MonitoredSignIn } from '@/components/monitored-sign-in'

interface SignInPageProps {
  params: Promise<{ lang: Locale }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function SignInPage({ params, searchParams }: SignInPageProps) {
  const { lang } = await params
  const search = await searchParams
  const dictionary = await getDictionary(lang)
  
  // 检查是否有上下文参数
  const clerkContext = search.clerk_context as string
  const redirectUrl = search.redirect_url as string
  
  // 根据上下文设置动态文案
  let customLocalization = {}
  if (clerkContext === 'likePhoto' && dictionary.clerkContextual?.signIn?.likePhoto?.subtitle) {
    customLocalization = {
      signIn: {
        start: {
          subtitle: dictionary.clerkContextual.signIn.likePhoto.subtitle
        }
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <ClerkProvider localization={customLocalization}>
          <MonitoredSignIn 
            redirectUrl={redirectUrl}
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-lg",
                // 确保社交登录按钮在暗黑模式下可见
                socialButtonsBlockButton:
                  "border border-zinc-700 dark:bg-gray-300 hover:bg-accent hover:text-accent-foreground text-foreground",
                socialButtonsBlockButtonText: "text-foreground font-medium",
                socialButtonsBlockButtonArrow: "text-foreground",
                providerIcon: "text-foreground opacity-90",
                formButtonPrimary:
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                formFieldInput:
                  "border border-zinc-700 bg-background text-foreground"
              }
            }}
          />
        </ClerkProvider>
      </div>
    </div>
  )
}
import { SignIn, ClerkProvider } from '@clerk/nextjs'
import { getDictionary } from '@/lib/dictionary'
import { type Locale } from '@/i18n-config'

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
          <SignIn 
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-lg"
              }
            }}
          />
        </ClerkProvider>
      </div>
    </div>
  )
}
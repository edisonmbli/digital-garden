4）构建全球化应用 (Internationalization, i18n)
欢迎来到我们旅程的第四章！
在前三章，我们已经为“数字花园”搭建了坚实的地基和安保系统。现在，是时候为我们的花园，装上通往世界的大门了。

章节目标: 本章将分为两个部分。在 Part 1，我们将快速地为应用集成一个基础、可用的国际化 (i18n) 功能。在 Part 2，我们将以专业架构师的视角，对我们第一版的代码进行重构和升级，解决其中潜藏的“坏味道”，并实现一个更健壮、更优雅的最终方案。

Part-1：快速实现一个“可用”的 i18n 系统
在这一部分，我们的目标是快速行动，让网站能够根据 URL，显示不同的语言。

4.1 核心策略：为何选择“基于路径”的国际化？
在开始写代码之前，我们要先明确 Next.js 官方推荐的最佳实践：基于路径的国际化 (Path-based i18n)。这意味着，我们网站的每一种语言版本，都会有一个独一无二的 URL 前缀。

- 英文版: https://your-domain.com/en/gallery
- 中文版: https://your-domain.com/zh/gallery
  这种方式对 SEO 最友好，也最符合用户的直觉。我们接下来所有的工作，都将围绕实现这个策略展开。

  4.2 语言配置与“翻译词典”

1. 实战：创建 i18n-config.ts: 在你的项目根目录下，创建此文件，定义我们支持的语言。

```
// i18n-config.ts
export const i18n = {
  defaultLocale: 'en',
  locales: ['en', 'zh'],
} as const;
export type Locale = (typeof i18n)['locales'][number];
```

2. 实战：创建“翻译词典”: 在根目录创建 dictionaries 文件夹，并创建 en.json 和 zh.json。

```
// dictionaries/en.json
{
  "header": { "signIn": "Sign In" },
  "homepage": { "title": "Code in Light", "enter_button": "Enter the Garden" }

// dictionaries/zh.json
{
  "header": { "signIn": "登录" },
  "homepage": { "title": "光影代码", "enter_button": "进入花园" }
}
```

> 注意: JSON 文件中不允许有注释。请在粘贴时移除。

3. 实战：创建“字典加载器”: 在 app/lib/ 目录下，创建一个新文件 dictionary.ts。

```
// app/lib/dictionary.ts
import 'server-only'
import type { Locale } from '@/i18n-config'

const dictionaries = {
  en: () => import('@/dictionaries/en.json').then((module) => module.default),
  zh: () => import('@/dictionaries/zh.json').then((module) => module.default),
}
export const getDictionary = async (locale: Locale) => dictionaries[locale]?.() ?? dictionaries.en()
```

> 专家提示: 我们稍后会回来升级这个文件，让它变得更强大。现在，这个基础版本已经足够我们跑通流程。

4.3 路由重构与基础渲染

1. 实战：创建动态路由: 在 app 目录下，创建一个新文件夹 [lang]。然后，将 app/page.tsx 和 app/layout.tsx 移动到这个新文件夹中。
2. 实战：修正 CSS 路径: 打开 app/[lang]/layout.tsx，将 import './globals.css' 修改为从项目根目录出发的绝对路径别名。

```
// app/[lang]/layout.tsx
import '@/app/globals.css'; // 使用这个更健壮的路径
```

> 专家提示 (Best Practice): 为什么这样做？因为相对路径 (./) 会随着文件的移动而失效，而基于 @/ 的路径别名，无论你的组件嵌套多深，都能保证路径的稳定和正确。 3. 实战：渲染国际化内容: 修改 app/[lang]/page.tsx 和 app/[lang]/layout.tsx，让它们获取并使用我们的字典。

````
// app/[lang]/page.tsx
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/dictionary";
import { type Locale } from "@/i18n-config";

export default async function Home({ params: { lang } }: { params: { lang: Locale } }) {
  const dict = await getDictionary(lang); // 获取字典

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-8">{dict.homepage.title}</h1>
      <Button>{dict.homepage.enter_button}</Button>
    </main>
  );
}
```tsx
// app/[lang]/layout.tsx
import { getDictionary } from '@/lib/dictionary';

export default async function RootLayout({ children, params: { lang } }: { /*...*/ }) {
  const dictionary = await getDictionary(lang);

  // ...
  // 在 Header 组件中，我们需要暂时传递 dictionary prop
  <Header dictionary={dictionary} />
  // ...
}
````

4.4 中间件：融合“安保”与“迎宾”
我们将把 Clerk 认证和 i18n 重定向逻辑，组合在一个 middleware.ts 文件中。

1. 实战：安装依赖:

```
pnpm install negotiator @formatjs/intl-localematcher
pnpm install -D @types/negotiator
```

> 教程：@types/ 是什么？ negotiator 是一个纯 JavaScript 库，它本身不带 TypeScript 类型定义。社区为了让 TypeScript 项目能安全地使用这类库，创建了 DefinitelyTyped 项目，专门为它们提供类型声明包，这些包都以 @types/ 为前缀。安装它，是现代 TypeScript 开发的“行业标准”。 2. 实战：升级 middleware.ts: 使用我们最终确认的、最稳健的版本。

```
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { i18n } from './i18n-config';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

function getLocale(request: NextRequest): string | undefined { /* ... */ }
const isProtectedRoute = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware((auth, request) => {
  if (isProtectedRoute(request)) auth().protect();

  const { pathname } = request.nextUrl;
  const pathnameIsMissingLocale = i18n.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

Part-2：架构重构 - 从“能跑”到“优雅”
祝贺你！现在你的应用已经具备了基础的国际化能力。它能跑，能切换语言，功能上似乎已经“完成”了。
但作为一个追求卓越的开发者，当你回顾 Part 1 的代码时，你可能会发现一个“坏味道 (Code Smell)”：
为了让 <Header> 和 <HomePage> 都能显示正确的语言，我们不得不从根布局 layout.tsx 开始，将 dictionary 和 lang 这两个 props，像接力棒一样，一层一层地向下传递。这就是所谓的“属性逐层传递 (Prop Drilling)”。
当应用变得复杂时，这种模式会让组件之间产生不必要的耦合，维护起来非常痛苦。在这一部分，我们将以专业架构师的视角，通过两种强大的、现代化的模式，来彻底解决这个问题，让我们的代码变得极其优雅和解耦。

4.5 终结 Prop Drilling (一)：用 React.cache 优化数据获取
我们面临的第一个问题: dictionary 是一个“重量级”的对象，每个需要它的组件都去调用一次 getDictionary，会不会造成性能问题？
解决方案: 使用 React 提供的 cache 函数，为我们的数据获取函数穿上“记忆铠甲”。

> 教程：React.cache 的魔法 cache 是 React 专门为 Server Components 提供的、用于在单次服务器渲染中，对函数结果进行记忆化 (Memoization) 的工具。当你用它包裹一个函数后，在这个函数被第一次调用时，React 会执行它并缓存结果。后续任何对这个函数的、带有相同参数的调用，都将瞬间从内存中返回缓存的结果，而不会再次执行函数本身。
> 这意味着，我们可以让任何需要“字典”的组件，都自信地、独立地、且高效地调用 getDictionary(lang)，而无需再依赖父组件的传递。

实战：升级你的“字典加载器”
打开 app/lib/dictionary.ts，我们将用 cache 来包裹 getDictionary。

```
// app/lib/dictionary.ts

import 'server-only'
import { cache } from 'react' // 1. 导入 React cache
import type { Locale } from '../../i18n-config'
import { enUS, zhCN } from '@clerk/localizations'

type ClerkLocalization = typeof enUS;

const clerkLocalizations: Record<Locale, ClerkLocalization> = {
  en: enUS,
  zh: zhCN,
}

const dictionaries = {
  en: () => import('@/dictionaries/en.json').then((module) => module.default),
  zh: () => import('@/dictionaries/zh.json').then((module) => module.default),
}

// 2. 将 getDictionary 函数用 cache 包裹起来
export const getDictionary = cache(async (locale: Locale) => {
  console.log(`Fetching dictionary for: ${locale}`); // 你可以加上这行日志来验证
  return dictionaries[locale]?.() ?? dictionaries.en()
});

export const getClerkLocalization = (locale: Locale): ClerkLocalization => {
  return clerkLocalizations[locale]
}
```

> 专家提示：
>
> - Record<Locale, ...>: 是为了让 TypeScript 帮助我们，在未来增加新语言（如 'fr'）时，能自动检查 dictionaries 对象是否也已同步更新，从而在编译时就避免运行时错误。
> - React.cache: 是为了让任何深层嵌套的服务端组件，都能自信地、独立地、且高效地调用 getDictionary(lang)，而无需担心重复读取文件造成性能问题。它是实现**服务端“无感知的全局状态”**的核心。
>   完成了！现在，getDictionary 已经拥有了“自动缓存”的超能力。

4.6 终结 Prop Drilling (二)：用 Middleware 注入“全局上下文”
我们面临的第二个问题: 解决了 dictionary 的传递，但 lang 这个“轻量级”的 prop 依然在层层传递。
解决方案: 使用“中间件注入请求头”模式。我们将让 Middleware 这个“智能迎宾员”，在处理每个请求时，都给它盖上一个“语言印章”（一个自定义的请求头），然后任何深层的服务端组件，都可以随时、独立地读取这个“印章”。
实战：升级 middleware.ts
打开你项目根目录的 middleware.ts，在 if (pathnameIsMissingLocale) 逻辑块的后面，加入注入请求头的逻辑。

```
// middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { i18n } from './i18n-config';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

function getLocale(request: NextRequest): string | undefined { /* ... */ }
const isProtectedRoute = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) await auth.protect();

  const { pathname } = request.nextUrl;

  // 国际化重定向逻辑 (保持不变)
  const pathnameIsMissingLocale = i18n.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );
  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }

  // --- 关键新增：为所有请求添加自定义请求头 ---
  // 1. 克隆现有的请求头，以便进行修改
  const requestHeaders = new Headers(request.headers);

  // 2. 从路径中，解析出当前的语言代码
  const localeInPath = i18n.locales.find(l => pathname.startsWith(`/${l}`));

  // 3. 将解析出的语言代码，设置到一个自定义的请求头 'x-locale' 中
  if (localeInPath) {
    requestHeaders.set('x-locale', localeInPath);
  }

  // 4. 继续请求链，但使用的是我们包含了新请求头的、经过修改的 request 对象
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

> 教程：async/await 的回归
> 你可能还记得，在第三章我们为了解决一个类型报错，曾深入讨论过 Middleware 的写法。现在，我们最终采纳的这个 async/await 版本，是 Clerk 官方推荐的、用于处理需要与认证状态进行交互的中间件的最佳实践。它确保了 auth.protect() 这个异步操作，能被正确地执行。

实战：重构组件，实现“自给自足”
现在，我们可以重构我们的组件，让它们不再依赖 props 传递。

Header.tsx (最终版)

> “现在，有了 React.cache 和注入到请求头的 x-locale 这两大‘神器’，我们的 <Header /> 组件终于可以摆脱所有 props 的束缚，实现完全的‘自给自足’了。它不再需要依赖父组件传递任何数据，自己就能独立、高效地完成所有工作。”

```
// components/ui/Header.tsx

import Link from 'next/link'
import { headers } from 'next/headers'
import { UserButton, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { Button } from './button'
import { ThemeToggle } from './theme-toggle' // 导入我们之前创建的 ThemeToggle
import { LanguageSwitcher } from './language-switcher' // 导入新的语言切换器
// import { Separator } from '@/components/ui/separator' // 导入分隔符组件
import { getDictionary } from '@/lib/dictionary' // 导入我们的字典函数
import { type Locale, i18n } from '@/i18n-config'

// Header 现在是一个不接收任何 props 的、完全自给自足的 Server Component
export async function Header() {
  const headersList = await headers()
  const lang = (headersList.get('x-locale') as Locale) || i18n.defaultLocale
  const dictionary = await getDictionary(lang)

  return (
    <header className="py-4 border-b">
      <nav className="container mx-auto flex justify-between items-center">
        {/* Logo 和站点名称，链接到首页 */}
        <Link href="`/${lang}`" className="font-bold text-xl tracking-tight">
          {dictionary.homepage.title} {/* <-- 使用字典 */}
        </Link>

        {/* 右侧的工具栏 */}
        <div className="flex items-center gap-4">
          {/*  “站点工具”组 */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          <SignedIn>
            {/*  视觉分隔符 */}
            {/* <Separator orientation="vertical" className="h-6 w-px bg-border" /> */}
            <div className="h-6 w-px bg-border" />
            {/* “用户中心”组 */}
            <UserButton />
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="outline">{dictionary.homepage.sign_in}</Button>
            </SignInButton>
          </SignedOut>
        </div>
      </nav>
    </header>
  )
}
```

layout.tsx (最终版)

```
  // app/[lang]/layout.tsx
  import { Header } from '@/components/ui/Header';
  // ... 其他 import

  export default async function RootLayout({
    children,
    params,    // 我们不再深层解构，而是接收完整的 params
  }: {
    children: React.ReactNode
    params: Promise<{ lang: Locale }>
  }) {
    // 在服务端获取所有需要的国际化资源
    const { lang } = await params  // 在函数体内安全地解构
    const dictionary = await getDictionary(lang)
    const clerkLocalization = getClerkLocalization(lang)

    return (
      <ClerkProvider localization={{ ...clerkLocalization, ...dictionary.clerk }}>
        <html lang="en" suppressHydrationWarning>
          <body
            className={`${fontSans.variable} ${fontSerif.variable} font-sans min-h-screen bg-background text-foreground antialiased`}
          >
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <div className="flex flex-col min-h-screen">
                {/* 2. 在这里直接使用 Header，干净利落 */}
                <Header />

                <main className="flex-grow">{children}</main>

                {/* 预留 Footer 的位置 */}
                {/* <Footer /> */}
              </div>
              <Toaster richColors />
            </ThemeProvider>
          </body>
        </html>
      </ClerkProvider>
    )
  }
```

> 专家讨论：await params vs. “中间件+headers()”

- 你可能想问，为什么我们在 layout.tsx 中不直接使用 headers() 来获取 lang？因为 await params 是 Next.js 框架直接为页面和布局提供的、用于获取动态路由段的最直接、最高效的方式。它的存在就是为了这个目的。
- 而“中间件+headers()”模式，是用于解决深层嵌套的、非页面级的服务端组件，如何优雅地获取请求上下文的通用解决方案。
- 我们在教程中，将两者结合使用，在每个层级都采用最合适的工具。

  4.7 深度国际化：让 Clerk “说”中文
  最后，我们来完成 Clerk 组件的深度汉化。

实战：扩充词典并应用

1. 扩充 zh.json:

```
  {
    "header": {
      "gallery": "影像馆",
      "log": "开发者说",
      "about": "关于"
    },
    "homepage": {
      "title": "光影代码",
      "enter_button": "进入花园",
      "sign_in": "登录"
    },
    "clerk": {
      "signIn": {
        "start": {
          "title": "登录 光影代码",
          "subtitle": "欢迎回来！",
          "actionText": "还没有账户？",
          "actionLink": "注册"
        },
        "factorOne": {
          "title": "验证您的身份",
          "subtitle": "请继续以完成登录",
          "continueButton": "继续"
        }
      },
      "signUp": {
        "start": {
          "title": "创建您的账户",
          "subtitle": "欢迎！请填写以下信息",
          "actionText": "已经有账户了？",
          "actionLink": "登录"
        },
        "continueButton": "继续"
      },
      "userButton": {
        "action__manageAccount": "管理账户",
        "action__signOut": "退出登录"
      },
      "form_button_continue": "继续",
      "form_field_label__emailAddress": "邮箱地址",
      "form_field_label__password": "密码",
      "form_field_label__firstName": "名",
      "form_field_label__lastName": "姓"
    }
  }
```

1. 更新 layout.tsx: 确保你的根布局，正在将合并后的本地化配置，传递给 <ClerkProvider> 的 localization prop。

```
// app/[lang]/layout.tsx
// ...
const dictionary = await getDictionary(lang);
const clerkLocalization = getClerkLocalization(lang);

return (
  <ClerkProvider localization={{ ...clerkLocalization, ...dictionary.clerk }}>
    {/* ... */}
  </ClerkProvider>
);
```

本章小结
通过这“两步走”的迭代升级，你不仅实现了完整的国际化功能，更重要的是，你掌握了在 Next.js App Router 中，如何通过 React.cache 和“中间件注入”等高级模式，来构建可维护、高性能、高度解耦的服务端组件架构。

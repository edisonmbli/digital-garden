番外篇-1：国际化也要“SSG”

你好，欢迎来到我们系列教程的第一个“番外篇”。
在软件工程的世界里，不存在一成不变的“银弹”。一个优秀的架构师，必须具备根据项目的核心需求，不断审视和演进技术方案的能力。在这一章，我们将共同进行一次这样专业的“自我审视”，将我们的国际化方案，升级为性能最优的完全静态生成 (SSG) 模式。

### 引言：一次必要的“自我审视”

在我们之前的章节中，为了彻底消除“Prop Drilling”，我们采用了一种“中间件注入 headers”的模式。

- 它的优点: 架构上非常纯粹，任何深层嵌套的服务端组件都可以独立获取 lang，实现了极致的解耦。
- 它在我们项目中的“隐患”: headers() 是一个动态函数。在任何组件中调用它，都会迫使 Next.js 将整个页面都切换为动态渲染模式。
  对于一个以内容展示为主、追求极致加载速度的“数字花园”来说，为了代码的“洁癖”而牺牲掉整个网站的静态化 (SSG) 性能优势，这是一种“矫枉过正”。
  现在，我们将进行一次架构重构，回归到 Next.js 官方文档最推崇的、也是最适合我们项目的国际化方案：完全静态生成。

### 新目标：拥抱静态，追求极致性能

我们的新武器，是 Next.js App Router 提供的一个核心 API：generateStaticParams。
教程：generateStaticParams 的作用
这个函数的作用，就是在构建时 (pnpm build)，告诉 Next.js：“对于 app/[lang] 这个动态路由，我需要你预先为以下这些 lang 参数，都生成一份完整的、静态的 HTML 页面。”
比如，我们让它返回 [{ lang: 'en' }, { lang: 'zh' }]，Next.js 就会在构建时，把我们网站的英文版和中文版，全部生成为静态文件，部署到全球 CDN。

### 实战一：为静态页面添加 generateStaticParams

1. 创建可复用的参数生成器
   为了避免在每个页面都重复编写相同的逻辑，我们先在 i18n-config.ts 中，导出一个简单的函数。

```
// i18n-config.ts

export const i18n = {
  defaultLocale: 'en',
  locales: ['en', 'zh'],
} as const;

export type Locale = (typeof i18n)['locales'][number];

// 新增：导出一个可复用的参数生成函数
export function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }));
}
```

2. 应用到你的页面中
   现在，在你所有需要被静态化的、带 [lang] 参数的 page.tsx 文件中，导入并导出这个函数。

```
// app/[lang]/page.tsx

import { generateStaticParams } from '@/i18n-config';
// ... 其他 import

// 告诉 Next.js 为 'en' 和 'zh' 生成此页面的静态版本
export { generateStaticParams };

export default async function Home({ params }: { params: { lang: Locale } }) {
  // ...
}
```

> 提示: 对 /about，/gallery 等所有其他静态页面，都执行相同的操作。

#### 实战二：重构数据获取与传递

现在，既然我们的页面是静态的，headers() 这个动态函数就成了“非法”的存在。我们需要将它从我们的代码中移除，并回归到更简单、对静态渲染更友好的 props 传递模式。

#### 1. 简化 middleware.ts

我们的“迎宾员”不再需要为每个请求都盖上“语言印章”了。它的职责回归纯粹。

```
// middleware.ts
// ...

export default clerkMiddleware((auth, request) => {
  if (isProtectedRoute(request)) auth().protect();

  // 移除所有与注入 'x-locale' 请求头相关的逻辑
  // 只保留国际化重定向
  const { pathname } = request.nextUrl;
  const pathnameIsMissingLocale = i18n.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }
});

// ... config 保持不变
```

#### 2. 重构 <Header /><Footer />等组件，让它重新接收 Props

> 教程: 我们将把 Header, Footer, HomePageShell, LogPageShell 等所有之前使用了 headers() 来独立获取 lang 和 dictionary 的服务端组件，全部改回接收 props 的模式。这虽然在代码上引入了适度的 Prop Drilling，但却是实现完全静态化 (SSG) 的必要权衡。

```
// app/ui/Header.tsx
import { getDictionary } from '@/lib/dictionary';
import { type Locale } from '@/i18n-config';
// ... 其他 import

// Header 现在接收 lang 和 dictionary 作为 props
export async function Header({ lang, dictionary }: { lang: Locale, dictionary: any }) { // 我们将在下一节修复 any
  return ( /* ... */ );
}
```

#### 3. 重构 layout.tsx，执行 Props Drilling

现在，根布局承担起了“数据分发”的职责。

```
// app/[lang]/layout.tsx

import { Header } from '@/app/ui/Header';
import { type Locale, generateStaticParams } from '@/i18n-config';
// ... 其他 import

// 确保根布局也导出了 generateStaticParams
export { generateStaticParams };

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: Locale };
}) {
  const { lang } = params; // 我们在这里安全地获取 lang
  const dictionary = await getDictionary(lang);
  // ... 其他数据获取 ...

  return (
    <ClerkProvider localization={...}>
      <html lang={lang} suppressHydrationWarning>
        <body>
          <div className="relative flex min-h-screen flex-col">
            {/* 将 lang 和 dictionary 作为 props 传递下去 */}
            <Header lang={lang} dictionary={dictionary} />
            <main className="flex-1">{children}</main>
            <Footer lang={lang} />
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

> 教程：关于“适度的”Prop Drilling
> 是的，我们重新引入了 Prop Drilling。但在我们“数字花园”这样组件层级相对较浅的应用中，将 lang 和 dictionary 这两个全局上下文，向下传递一到两层，是一种完全可以接受的、务实的选择。我们用这一点点代码上的“不纯粹”，换来了整个网站极致的静态性能，这是一笔非常划算的“交易”。

#### 4. 拥抱未来：适配 Next.js 15 的异步 API

在你完成以上重构并尝试 pnpm build 时，你可能会遇到一个关于 params 类型的错误，或者在 pnpm dev 时，看到一个关于 await params 的警告。这正是我们与前沿技术同行时，必然会遇到的“幸福的烦恼”。

> 教程：params 为何变成了 Promise？
> 正如官方文档所说，从 Next.js 15 开始，为了支持更高级的并发和流式渲染特性，传递给页面和布局的 params 和 searchParams props，已经从一个同步对象，演进为了一个异步的 Promise。
> 这意味着，我们不能再像以前一样，直接在函数签名中解构它 ({ params: { lang } })。我们必须先 await 这个 params Promise，然后再从中安全地解构出我们需要的属性。

实战：使用 codemod 自动升级
Next.js 团队为我们提供了强大的“代码迁移”工具，可以自动完成这次升级。
在你的项目根目录，运行以下命令：
`npx @next/codemod@latest next-async-request-api .`

实战：审查自动修复后的代码
codemod 会自动扫描你的项目，并将所有需要修改的页面和布局文件进行更新。

```
// app/[lang]/page.tsx (自动修复后)

import { type Locale } from "@/i18n-config";

// 1. props 的类型，现在被正确地标记为了 Promise
export default async function Home(props: {
  params: Promise<{ lang: Locale }>
}) {
  // 2. 在函数体内部，我们首先 await props.params
  const params = await props.params
  // 3. 然后再从中安全地解构出 lang
  const { lang } = params

  const dict = await getDictionary(lang);

  return (
    <HomePageShell dictionary={dict} />
  );
}
```

> 增益: 通过这次自动化的重构，我们不仅解决了 pnpm build 的报错，还让我们的代码完全适配了 Next.js 最新的渲染范式，为未来的性能优化打下了坚实的基础。
> 提示: 后续新增的 page 代码逻辑，也需要遵循 Nextjs 15+最新的规范

### 最终验证与性能对比

现在，执行我们最期待的命令：
`pnpm build`

在构建日志的最后，你将看到一个激动人心的报告。所有你的核心页面，无论是英文版还是中文版，都将被标记为 ○ (Static)。
这意味着：你的整个“数字花园”，已经被预先编译成了一套超快速的、纯粹的 HTML 文件，并被部署到了 Vercel 的全球 CDN 边缘。任何用户，在世界的任何一个角落，都能以接近瞬时的速度，打开你的网站。

我们成功地，为我们的项目，选择了最匹配其核心价值的、性能最优的架构！

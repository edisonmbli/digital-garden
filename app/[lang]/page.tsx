// app/[lang]/page.tsx

import { HomePageShell } from '@/app/ui/home-page-shell'

// 注意：即使 HomePageShell 是一个服务端组件，
// 我们的 Page 组件本身也可以是一个简单的同步组件，因为它不直接执行异步操作。
export default function Home() {
  return <HomePageShell />
}

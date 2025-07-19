// app/[lang]/gallery/page.tsx
import { GalleryPageShell } from '@/app/ui/gallery-page-shell'
import { generateStaticParams } from '@/i18n-config'

// 告诉 Next.js 为 'en' 和 'zh' 生成此页面的静态版本
export { generateStaticParams }

export default function GalleryPage() {
  // 在第六章，我们会在这里获取真实数据并作为 props 传递下去
  return <GalleryPageShell />
}

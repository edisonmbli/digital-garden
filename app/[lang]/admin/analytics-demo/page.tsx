import { AnalyticsDemo } from '@/app/ui/analytics-demo'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analytics 演示 | Digital Garden',
  description: '测试和演示自建Analytics系统的各种功能',
}

export default function AnalyticsDemoPage() {
  return <AnalyticsDemo />
}
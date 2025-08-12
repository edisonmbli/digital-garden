import { AnalyticsDashboard } from '@/app/ui/analytics-dashboard'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analytics 数据面板 | Digital Garden',
  description: '查看和分析收集到的用户行为数据',
}

export default function AnalyticsDashboardPage() {
  return <AnalyticsDashboard />
}
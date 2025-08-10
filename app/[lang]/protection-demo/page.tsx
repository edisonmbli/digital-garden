// app/[lang]/protection-demo/page.tsx
import ProtectedImage from '@/app/ui/protected-image'
import { ProtectedContent } from '@/app/ui/protected-content'
import { CopyrightNotice } from '@/app/ui/copyright-notice'
import { Shield, Eye, Lock, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type Locale } from '@/i18n-config'
import { type Metadata } from 'next'
import { getDictionary } from '@/lib/dictionary'
import { logger } from '@/lib/logger'
import Link from 'next/link'

interface ProtectionDemoPageProps {
  params: {
    lang: Locale
  }
}

export async function generateMetadata({
  params,
}: ProtectionDemoPageProps): Promise<Metadata> {
  const { lang } = await params
  const dict = await getDictionary(lang)
  
  return {
    title: dict.protection.title,
    description: dict.protection.description,
    robots: {
      index: false, // 不索引演示页面
      follow: false,
    },
  }
}

export default async function ProtectionDemoPage({
  params,
}: ProtectionDemoPageProps) {
  const { lang } = await params
  const dict = await getDictionary(lang)
  
  // 记录页面访问日志
  logger.info('ProtectionDemo', 'Page accessed', { lang })
  
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 页面标题 */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary mr-3" />
            <h1 className="text-3xl font-bold text-foreground">{dict.protection.title}</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {dict.protection.description}
          </p>
        </header>

        {/* 保护功能概览 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center">
            <Eye className="h-6 w-6 mr-2 text-primary" />
            {dict.protection.overview.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Shield className="h-5 w-5 mr-2 text-green-600" />
                  {dict.protection.imageProtection.title}
                </CardTitle>
                <CardDescription>
                  {dict.protection.imageProtection.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {dict.protection.imageProtection.features.map((feature, index) => (
                    <li key={index}>• {feature}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Lock className="h-5 w-5 mr-2 text-blue-600" />
                  {dict.protection.contentProtection.title}
                </CardTitle>
                <CardDescription>
                  {dict.protection.contentProtection.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {dict.protection.contentProtection.features.map((feature, index) => (
                    <li key={index}>• {feature}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <AlertTriangle className="h-5 w-5 mr-2 text-amber-600" />
                  {dict.protection.accessMonitoring.title}
                </CardTitle>
                <CardDescription>
                  {dict.protection.accessMonitoring.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {dict.protection.accessMonitoring.features.map((feature, index) => (
                    <li key={index}>• {feature}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 图片保护演示 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">{dict.protection.imageDemo.title}</h2>
          <Alert className="mb-6">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>{dict.protection.imageDemo.testLabel}</strong>
              {dict.protection.imageDemo.testInstructions}
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-3 flex items-center">
                <Badge variant="secondary" className="mr-2">{dict.protection.imageDemo.demoLabel}</Badge>
                {dict.protection.imageDemo.protectedImage}
              </h3>
              <ProtectedImage
                src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop"
                alt="受保护的演示图片"
                width={500}
                height={300}
                showWatermark={true}
                className="rounded-lg shadow-md"
                adaptiveContainer={true}
                maxHeight="400px"
              />
              <CopyrightNotice 
                contentType="photo" 
                variant="default" 
                className="mt-2"
                copyrightData={{
                  title: dict.copyright?.photo?.title,
                  content: dict.copyright?.photo?.content,
                  minimal: dict.copyright?.photo?.minimal,
                }}
              />
            </div>
            
            <div>
              <h3 className="font-medium mb-3 flex items-center">
                <Badge variant="outline" className="mr-2">{dict.protection.imageDemo.compareLabel}</Badge>
                {dict.protection.imageDemo.normalImage}
              </h3>
              <img
                src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop"
                alt={dict.protection.imageDemo.normalImage}
                width={500}
                height={300}
                className="rounded-lg shadow-md"
              />
              <p className="text-sm text-muted-foreground mt-2">
                {dict.protection.imageDemo.normalImageNote}
              </p>
            </div>
          </div>
        </section>

        {/* 内容保护演示 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">{dict.protection.contentDemo.title}</h2>
          <Alert className="mb-6">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <strong>{dict.protection.contentDemo.testLabel}</strong>
              {dict.protection.contentDemo.testInstructions}
            </AlertDescription>
          </Alert>

          <ProtectedContent showWatermark={true}>
            <Card>
              <CardHeader>
                <CardTitle>{dict.protection.contentDemo.protectedContent}</CardTitle>
                <CardDescription>
                  {dict.protection.contentDemo.contentDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="text-lg font-semibold">{dict.protection.contentDemo.tutorialTitle}</h3>
                <p className="text-muted-foreground">
                  {dict.protection.contentDemo.tutorialIntro}
                </p>
                
                {dict.protection.contentDemo.tutorialSections.map((section, index) => (
                  <div key={index} className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">{section.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {section.content}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <CopyrightNotice 
              contentType="tutorial" 
              variant="minimal" 
              className="mt-4"
              copyrightData={{
                title: dict.copyright?.tutorial?.title,
                content: dict.copyright?.tutorial?.content,
                minimal: dict.copyright?.tutorial?.minimal,
              }}
            />
          </ProtectedContent>
        </section>

        {/* 使用条款链接 */}
        <section className="text-center">
          <h2 className="text-2xl font-semibold mb-4">{dict.protection.learnMore}</h2>
          <p className="text-muted-foreground mb-6">
            {dict.protection.learnMoreDescription}
          </p>
          <Link 
            href={`/${lang}/terms`} 
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Shield className="h-4 w-4 mr-2" />
            {dict.protection.viewTerms}
          </Link>
        </section>
      </div>
    </div>
  )
}
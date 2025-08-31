import {
  Copyright,
  AlertTriangle,
  Camera,
  BookOpen,
  Eye,
  Scale,
  Mail,
  FileText,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getDictionary } from '@/lib/dictionary'

type DictionaryType = Awaited<ReturnType<typeof getDictionary>>

interface TermsOfUseProps {
  dictionary: DictionaryType
  className?: string
}

export function TermsOfUse({ dictionary: dict, className }: TermsOfUseProps) {
  const contactEmail =
    process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@digitalgarden.ai'

  return (
    <div className={className}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center mb-2">
            {/* <Shield className="h-6 w-6 text-primary mr-4" /> */}
            <h1 className="text-display-md font-bold text-foreground">
              {dict.terms.title}
            </h1>
          </div>
          <p className="text-muted-foreground text-display-xs max-w-3xl mx-auto">
            {dict.terms.subtitle}
          </p>
        </header>

        <div className="space-y-12">
          {/* 版权声明 */}
          <section className="bg-card rounded-xl p-8 shadow-sm border">
            <div className="flex items-center mb-2">
              <Copyright className="h-6 w-6 text-primary mr-3" />
              <h2 className="text-body-lg font-semibold text-foreground">
                {dict.terms.copyright.title}
              </h2>
            </div>
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-body-sm">
                <span className="text-blue-700 dark:text-blue-300">
                  {dict.terms.copyright.notice}
                </span>
              </AlertDescription>
            </Alert>
          </section>

          {/* 摄影作品使用规范 */}
          <section className="bg-card rounded-xl p-8 shadow-sm border">
            <div className="flex items-center mb-2">
              <Camera className="h-6 w-6 text-primary mr-3" />
              <h2 className="text-body-lg font-semibold text-foreground">
                {dict.terms.photography.title}
              </h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <div className="p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                  {dict.terms.photography.allowed}
                </h3>
                <ul className="text-body-sm space-y-1">
                  {dict.terms.photography.allowedItems.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-lg border border-red-200 dark:border-red-800">
                <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                  {dict.terms.photography.prohibited}
                </h3>
                <ul className="text-body-sm space-y-1">
                  {dict.terms.photography.prohibitedItems.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* 技术教程使用规范 */}
          <section className="bg-card rounded-xl p-8 shadow-sm border">
            <div className="flex items-center mb-2">
              <BookOpen className="h-6 w-6 text-primary mr-3" />
              <h2 className="text-body-lg font-semibold text-foreground">
                {dict.terms.tutorials.title}
              </h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <div className="p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                  {dict.terms.tutorials.encouraged}
                </h3>
                <ul className="text-body-sm space-y-1">
                  {dict.terms.tutorials.encouragedItems.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-lg border border-red-200 dark:border-red-800">
                <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                  {dict.terms.tutorials.prohibited}
                </h3>
                <ul className="text-body-sm space-y-1">
                  {dict.terms.tutorials.prohibitedItems.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* 授权申请 */}
          <section className="bg-card rounded-xl p-8 shadow-sm border">
            <div className="flex items-center mb-2">
              <Scale className="h-6 w-6 text-primary mr-3" />
              <h2 className="text-body-lg font-semibold text-foreground">
                {dict.terms.authorization.title}
              </h2>
            </div>
            <div className="space-y-4 text-body-sm text-muted-foreground">
              <p>{dict.terms.authorization.description}</p>
              <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <ul className="text-body-sm space-y-1 mb-3">
                  {dict.terms.authorization.purposes.map((purpose, index) => (
                    <li key={index}>• {purpose}</li>
                  ))}
                </ul>
                <div className="flex items-center mt-3">
                  <Mail className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-blue-700 dark:text-blue-300">
                    {dict.terms.authorization.contact}
                    <a
                      href={`mailto:${contactEmail}`}
                      className="underline hover:no-underline"
                    >
                      {contactEmail}
                    </a>
                  </span>
                </div>
                <p className="text-body-xs text-blue-600">
                  {dict.terms.authorization.contactNote}
                </p>
              </div>
            </div>
          </section>

          {/* 技术保护措施 */}
          <section className="bg-card rounded-xl p-8 shadow-sm border">
            <div className="flex items-center mb-2">
              <Eye className="h-6 w-6 text-primary mr-3" />
              <h2 className="text-body-lg font-semibold text-foreground">
                {dict.terms.technicalProtection.title}
              </h2>
            </div>
            <div className="space-y-4 text-body-sm text-muted-foreground">
              <p>{dict.terms.technicalProtection.notice}</p>
            </div>
          </section>

          {/* 法律责任 */}
          <section className="bg-card rounded-xl p-8 shadow-sm border">
            <div className="flex items-center mb-2">
              <FileText className="h-6 w-6 text-primary mr-3" />
              <h2 className="text-body-lg font-semibold text-foreground">
                {dict.terms.legalResponsibility.title}
              </h2>
            </div>
            <div className="space-y-4 text-body-sm text-muted-foreground">
              <p>{dict.terms.legalResponsibility.description}</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                {dict.terms.legalResponsibility.consequences.map(
                  (consequence, index) => (
                    <li key={index}>{consequence}</li>
                  )
                )}
              </ul>
              <p className="font-medium">
                {dict.terms.legalResponsibility.rights}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

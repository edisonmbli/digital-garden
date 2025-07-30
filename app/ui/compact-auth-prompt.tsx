'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SignIn } from '@clerk/nextjs'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface CompactAuthPromptProps {
  isOpen: boolean
  onClose: () => void
  redirectUrl?: string
}

export function CompactAuthPrompt({ 
  isOpen, 
  onClose, 
  redirectUrl,
}: CompactAuthPromptProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-sm p-0 gap-0 border-none shadow-lg"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          登录后继续评论
        </DialogTitle>

        {/* 关闭按钮 */}
        <div className="flex justify-end p-3 pb-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 rounded-full"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">关闭</span>
          </Button>
        </div>

        {/* 简洁的登录提示 */}
        <div className="px-6 pb-6 pt-2">
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground">
              请
              <Button
                variant="link"
                className="p-0 h-auto text-sm font-medium text-primary"
                onClick={() => {
                  // 这里会触发 SignIn 组件
                }}
              >
                登录
              </Button>
              后发表评论
            </p>
          </div>
          
          {/* Clerk登录组件 - 紧凑模式 */}
          <SignIn
            routing="hash"
            redirectUrl={redirectUrl}
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none border-0 bg-transparent',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton:
                  'border border-gray-200 bg-background hover:bg-accent text-foreground text-sm py-2',
                socialButtonsBlockButtonText: 'text-foreground font-medium text-sm',
                formButtonPrimary:
                  'bg-primary text-primary-foreground hover:bg-primary/90 text-sm py-2',
                formFieldInput:
                  'bg-background border border-gray-200 text-foreground text-sm',
                formFieldLabel: 'text-foreground font-medium text-sm',
                footerActionLink: 'text-primary hover:text-primary/80 text-sm',
                footerActionText: 'text-muted-foreground text-sm',
                form: 'space-y-3',
                formField: 'space-y-1',
                formButtonGroup: 'space-y-2',
              },
              layout: {
                socialButtonsPlacement: 'top',
              },
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
'use client'

import { SignIn } from '@clerk/nextjs'
import { useUser } from '@clerk/nextjs'
import { useEffect, useCallback, useRef } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/app/context/i18n-provider'
import { useClerkContext } from '@/lib/clerk-context'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onAuthSuccess?: () => void
  action?: 'default' | 'like'
  redirectUrl?: string
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onAuthSuccess,
  action = 'default',
  redirectUrl,
}: AuthModalProps) {
  const { user, isLoaded } = useUser()
  const dictionary = useI18n()
  const { setContextualConfig } = useClerkContext()
  
  // 使用 ref 来跟踪上一次的用户状态，避免不必要的回调触发
  const prevUserRef = useRef<typeof user>(null)
  const hasTriggeredCallbackRef = useRef(false)

  // 使用 useCallback 来稳定化回调函数
  const handleAuthSuccess = useCallback(() => {
    if (onAuthSuccess && !hasTriggeredCallbackRef.current) {
      hasTriggeredCallbackRef.current = true
      onAuthSuccess()
      onClose()
    }
  }, [onAuthSuccess, onClose])

  // 监听用户登录状态变化 - 优化依赖项
  useEffect(() => {
    // 只有当用户从未登录变为已登录时才触发回调
    if (isLoaded && user && !prevUserRef.current && !hasTriggeredCallbackRef.current) {
      handleAuthSuccess()
    }
    
    // 更新 ref
    prevUserRef.current = user
  }, [isLoaded, user, handleAuthSuccess])

  // 重置回调标志当模态框重新打开时
  useEffect(() => {
    if (isOpen) {
      hasTriggeredCallbackRef.current = false
    }
  }, [isOpen])

  // 设置动态文案 - 优化依赖项
  useEffect(() => {
    if (
      isOpen &&
      action === 'like' &&
      dictionary.clerkContextual?.signIn?.likePhoto?.subtitle
    ) {
      setContextualConfig({
        signIn: {
          start: {
            subtitle: dictionary.clerkContextual.signIn.likePhoto.subtitle,
          },
        },
      })
    }

    // 清理：当模态框关闭时重置配置
    return () => {
      if (!isOpen) {
        setContextualConfig({})
      }
    }
  }, [
    isOpen,
    action,
    dictionary.clerkContextual?.signIn?.likePhoto?.subtitle,
    setContextualConfig,
  ])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md p-0 gap-0 border-none shadow-none"
        showCloseButton={false}
      >
        {/* 隐藏的DialogTitle，用于无障碍访问 */}
        <DialogTitle className="sr-only">
          {action === 'like' ? '登录后继续点赞' : '登录'}
        </DialogTitle>

        {/* 自定义关闭按钮 */}
        <div className="flex justify-end p-4 pb-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">关闭</span>
          </Button>
        </div>

        {/* Clerk登录组件 */}
        <div className="p-6 pt-2">
          <SignIn
            routing="hash"
            redirectUrl={redirectUrl}
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none border-0 bg-transparent',
                headerTitle: 'text-xl font-semibold text-foreground',
                headerSubtitle: 'text-sm text-muted-foreground',
                // 社交登录按钮样式 - 确保边框在暗黑模式下可见
                socialButtonsBlockButton:
                  'border border-zinc-700 dark:bg-gray-300 hover:bg-accent hover:text-accent-foreground text-foreground',
                socialButtonsBlockButtonText: 'text-foreground font-medium',
                socialButtonsBlockButtonArrow: 'text-foreground',
                // GitHub 图标和其他社交图标
                providerIcon: 'text-foreground opacity-90',
                // 主要按钮
                formButtonPrimary:
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                // 输入框样式 - 确保边框在暗黑模式下可见
                formFieldInput:
                  'bg-grey-300 border border-zinc-700 text-foreground placeholder:text-muted-foreground',
                formFieldLabel: 'text-foreground font-medium',
                formFieldInputShowPasswordButton:
                  'text-muted-foreground hover:text-foreground',
                // 身份预览
                identityPreviewText: 'text-foreground',
                identityPreviewEditButton: 'text-primary hover:text-primary/80',
                // 链接和文本
                footerActionLink: 'text-primary hover:text-primary/80',
                footerActionText: 'text-muted-foreground',
                // 分割线
                dividerLine: 'bg-border',
                dividerText: 'text-muted-foreground',
                // 备选方法按钮
                alternativeMethodsBlockButton:
                  'border border-zinc-700 bg-background hover:bg-accent text-foreground',
                alternativeMethodsBlockButtonText: 'text-foreground',
                // OTP 输入
                otpCodeFieldInput:
                  'bg-background border border-zinc-700 text-foreground',
                // 重发链接
                formResendCodeLink: 'text-primary hover:text-primary/80',
                // 错误信息
                formFieldErrorText: 'text-destructive',
                // 帮助文本
                formFieldHintText: 'text-muted-foreground',
                // 加载状态
                spinner: 'text-primary',
                // 表单容器
                form: 'space-y-4',
                // 输入框容器
                formField: 'space-y-2',
                // 按钮容器
                formButtonGroup: 'space-y-2',
                // GitHub 和 Google 特定按钮样式 - 确保边框在暗黑模式下可见
                socialButtonsBlockButton__github:
                  'border border-zinc-700 bg-background hover:bg-accent hover:text-accent-foreground text-foreground',
                socialButtonsBlockButton__google:
                  'border border-zinc-700 bg-background hover:bg-accent hover:text-accent-foreground text-foreground',
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

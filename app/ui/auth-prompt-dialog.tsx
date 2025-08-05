'use client'

import { SignInButton } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Heart, LogIn } from 'lucide-react'

interface AuthPromptDialogProps {
  isOpen: boolean
  onClose: () => void
  action?: 'like' | 'comment' // 可以扩展支持不同的操作类型
}

export function AuthPromptDialog({ 
  isOpen, 
  onClose, 
  action = 'like' 
}: AuthPromptDialogProps) {
  const [currentUrl, setCurrentUrl] = useState('')
  
  // 在客户端渲染时获取当前URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href)
    }
  }, [])

  const actionText = action === 'like' ? 'like photos' : 'leave comments'
  const ActionIcon = action === 'like' ? Heart : LogIn

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ActionIcon className="h-5 w-5 text-red-500" />
            Sign in to {actionText}
          </DialogTitle>
          <DialogDescription className="text-center py-4">
            Join our community to {actionText} and connect with other photography enthusiasts.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3">
          <SignInButton mode="modal" forceRedirectUrl={currentUrl}>
            <Button className="w-full" size="lg">
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          </SignInButton>
          
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full"
          >
            Maybe Later
          </Button>
        </div>
        
        <p className="text-caption-xs text-muted-foreground text-center mt-4">
          By signing in, you agree to our terms of service and privacy policy.
        </p>
      </DialogContent>
    </Dialog>
  )
}
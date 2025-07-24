'use client'

import * as React from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerTitle } from '@/app/ui/drawer'

interface ResponsiveDialogProps {
  children: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ResponsiveDialogContentProps {
  children: React.ReactNode
  className?: string
}

export function ResponsiveDialog({
  children,
  open,
  onOpenChange,
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {children}
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {children}
    </Drawer>
  )
}

export function ResponsiveDialogContent({
  children,
  className,
}: ResponsiveDialogContentProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  if (isDesktop) {
    return (
      <DialogContent className={className} showCloseButton={true}>
        <DialogTitle className="sr-only">Photo Details</DialogTitle>
        {children}
      </DialogContent>
    )
  }

  return (
    <DrawerContent className={className}>
      <DrawerTitle className="sr-only">Photo Details</DrawerTitle>
      {children}
    </DrawerContent>
  )
}

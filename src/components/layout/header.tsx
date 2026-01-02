'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title: string
  showBack?: boolean
  leftAction?: React.ReactNode
  rightAction?: React.ReactNode
  className?: string
}

export function Header({
  title,
  showBack = false,
  leftAction,
  rightAction,
  className,
}: HeaderProps) {
  const router = useRouter()

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4 safe-area-top',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {leftAction && <div className="mr-2">{leftAction}</div>}
        {!leftAction && showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Zurück</span>
          </Button>
        )}
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      {rightAction && <div>{rightAction}</div>}
    </header>
  )
}

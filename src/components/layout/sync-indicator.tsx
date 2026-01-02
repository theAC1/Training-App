'use client'

import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SyncIndicatorProps {
  isOnline: boolean
  pendingCount: number
  isSyncing?: boolean
  className?: string
}

export function SyncIndicator({
  isOnline,
  pendingCount,
  isSyncing = false,
  className,
}: SyncIndicatorProps) {
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
        !isOnline && 'bg-destructive/10 text-destructive',
        isOnline && pendingCount > 0 && 'bg-warning/10 text-warning',
        isSyncing && 'bg-primary/10 text-primary',
        className
      )}
    >
      {!isOnline && (
        <>
          <CloudOff className="h-4 w-4" />
          <span>Offline</span>
        </>
      )}
      {isOnline && isSyncing && (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Synchronisiere...</span>
        </>
      )}
      {isOnline && !isSyncing && pendingCount > 0 && (
        <>
          <Cloud className="h-4 w-4" />
          <span>{pendingCount} ausstehend</span>
        </>
      )}
    </div>
  )
}

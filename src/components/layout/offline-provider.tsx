'use client'

import { useEffect } from 'react'
import { useOnlineStatus, useSyncQueue } from '@/hooks'
import { useToast } from '@/hooks/use-toast'

interface OfflineProviderProps {
  children: React.ReactNode
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const { isOnline } = useOnlineStatus()
  const { pendingCount, lastError } = useSyncQueue()
  const { toast } = useToast()

  // Show toast when going offline/online
  useEffect(() => {
    if (!isOnline) {
      toast({
        title: 'Offline',
        description: 'Du bist offline. Deine Eingaben werden gespeichert und später synchronisiert.',
        variant: 'destructive',
      })
    }
  }, [isOnline, toast])

  // Show toast when coming back online with pending items
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      toast({
        title: 'Wieder online',
        description: `${pendingCount} Einträge werden synchronisiert...`,
      })
    }
  }, [isOnline, pendingCount, toast])

  // Show error toast
  useEffect(() => {
    if (lastError) {
      toast({
        title: 'Synchronisierungsfehler',
        description: lastError,
        variant: 'destructive',
      })
    }
  }, [lastError, toast])

  return <>{children}</>
}

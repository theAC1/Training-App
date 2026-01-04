'use client'

import { useOnlineStatus, useSyncQueue } from '@/hooks'
import { SyncIndicator } from './sync-indicator'

export function SyncStatus() {
  const { isOnline } = useOnlineStatus()
  const { pendingCount, isSyncing } = useSyncQueue()

  return (
    <SyncIndicator
      isOnline={isOnline}
      pendingCount={pendingCount}
      isSyncing={isSyncing}
    />
  )
}

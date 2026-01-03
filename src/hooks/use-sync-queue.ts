'use client'

import { useEffect, useCallback } from 'react'
import { useSyncQueueStore } from '@/stores'
import { useOnlineStatus } from './use-online-status'
import {
  countPendingLogs,
  getPendingSetLogs,
  getFailedSetLogs,
  updateSetLogSyncStatus,
  deleteSetLog,
  type OfflineSetLog,
} from '@/lib/indexeddb'

const MAX_RETRY_COUNT = 5
const BASE_RETRY_DELAY = 2000 // 2 seconds

function getRetryDelay(retryCount: number): number {
  // Exponential backoff: 2s, 4s, 8s, 16s, 32s
  return Math.min(BASE_RETRY_DELAY * Math.pow(2, retryCount), 32000)
}

export function useSyncQueue() {
  const { isOnline } = useOnlineStatus()
  const {
    pendingCount,
    isSyncing,
    lastSyncAt,
    lastError,
    setPendingCount,
    setIsSyncing,
    setLastSyncAt,
    setLastError,
    decrementPendingCount,
  } = useSyncQueueStore()

  // Update pending count from IndexedDB
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await countPendingLogs()
      setPendingCount(count)
    } catch (error) {
      console.error('Failed to count pending logs:', error)
    }
  }, [setPendingCount])

  // Sync a single set log
  const syncSetLog = useCallback(
    async (log: OfflineSetLog): Promise<boolean> => {
      try {
        await updateSetLogSyncStatus(log.client_uuid, 'syncing')

        const response = await fetch('/api/set-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planned_exercise_id: log.planned_exercise_id,
            set_number: log.set_number,
            reps_completed: log.reps_completed,
            weight_used: log.weight_used,
            pain_flag: log.pain_flag,
            notes: log.notes,
            client_uuid: log.client_uuid,
            logged_at: log.logged_at,
          }),
        })

        if (response.ok) {
          await updateSetLogSyncStatus(log.client_uuid, 'synced')
          // Optionally delete synced logs after successful sync
          await deleteSetLog(log.client_uuid)
          return true
        }

        // Handle duplicate (already synced)
        if (response.status === 409) {
          await deleteSetLog(log.client_uuid)
          return true
        }

        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const newRetryCount = (log.retryCount || 0) + 1

        if (newRetryCount >= MAX_RETRY_COUNT) {
          await updateSetLogSyncStatus(log.client_uuid, 'failed', errorMessage)
        } else {
          await updateSetLogSyncStatus(log.client_uuid, 'pending', errorMessage)
        }

        return false
      }
    },
    []
  )

  // Process the sync queue
  const processQueue = useCallback(async () => {
    if (!isOnline || isSyncing) return

    setIsSyncing(true)
    setLastError(null)

    try {
      const pendingLogs = await getPendingSetLogs()
      const failedLogs = await getFailedSetLogs()

      // Filter failed logs that are eligible for retry
      const retryableLogs = failedLogs.filter((log) => log.retryCount < MAX_RETRY_COUNT)

      const allLogs = [...pendingLogs, ...retryableLogs]

      if (allLogs.length === 0) {
        setLastSyncAt(new Date())
        return
      }

      let successCount = 0
      let failCount = 0

      for (const log of allLogs) {
        // Check if still online
        if (!navigator.onLine) {
          break
        }

        // Delay based on retry count for failed logs
        if (log.retryCount > 0) {
          const delay = getRetryDelay(log.retryCount)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }

        const success = await syncSetLog(log)
        if (success) {
          successCount++
          decrementPendingCount()
        } else {
          failCount++
        }
      }

      if (successCount > 0) {
        setLastSyncAt(new Date())
      }

      if (failCount > 0) {
        setLastError(`${failCount} Einträge konnten nicht synchronisiert werden`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Synchronisierung fehlgeschlagen'
      setLastError(errorMessage)
    } finally {
      setIsSyncing(false)
      await refreshPendingCount()
    }
  }, [
    isOnline,
    isSyncing,
    syncSetLog,
    setIsSyncing,
    setLastSyncAt,
    setLastError,
    decrementPendingCount,
    refreshPendingCount,
  ])

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      // Small delay to ensure connection is stable
      const timeoutId = setTimeout(() => {
        processQueue()
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [isOnline, pendingCount, isSyncing, processQueue])

  // Initial pending count load
  useEffect(() => {
    refreshPendingCount()
  }, [refreshPendingCount])

  return {
    pendingCount,
    isSyncing,
    lastSyncAt,
    lastError,
    processQueue,
    refreshPendingCount,
  }
}

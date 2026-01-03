'use client'

import { useCallback } from 'react'
import { useSyncQueueStore } from '@/stores'
import { useOnlineStatus } from './use-online-status'
import {
  saveSetLog,
  generateClientUuid,
  getSetLogsForExercise,
  type OfflineSetLog,
} from '@/lib/indexeddb'

export interface SetLogInput {
  plannedExerciseId: string
  athleteId: string
  setNumber: number
  repsCompleted: number
  weightUsed?: number | null
  painFlag?: boolean
  notes?: string | null
}

export function useSetLogger() {
  const { isOnline } = useOnlineStatus()
  const { incrementPendingCount } = useSyncQueueStore()

  const logSet = useCallback(
    async (input: SetLogInput): Promise<{ success: boolean; clientUuid: string }> => {
      const clientUuid = generateClientUuid()
      const now = new Date().toISOString()

      const offlineLog: OfflineSetLog = {
        planned_exercise_id: input.plannedExerciseId,
        athlete_id: input.athleteId,
        set_number: input.setNumber,
        reps_completed: input.repsCompleted,
        weight_used: input.weightUsed ?? null,
        pain_flag: input.painFlag ?? false,
        notes: input.notes ?? null,
        client_uuid: clientUuid,
        logged_at: now,
        syncStatus: 'pending',
        retryCount: 0,
        createdAt: now,
      }

      try {
        // Always save to IndexedDB first (offline-first approach)
        await saveSetLog(offlineLog)
        incrementPendingCount()

        // If online, try to sync immediately
        if (isOnline) {
          try {
            const response = await fetch('/api/set-logs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                planned_exercise_id: input.plannedExerciseId,
                set_number: input.setNumber,
                reps_completed: input.repsCompleted,
                weight_used: input.weightUsed,
                pain_flag: input.painFlag,
                notes: input.notes,
                client_uuid: clientUuid,
                logged_at: now,
              }),
            })

            if (response.ok || response.status === 409) {
              // Successfully synced or duplicate - remove from IndexedDB
              const { deleteSetLog } = await import('@/lib/indexeddb')
              await deleteSetLog(clientUuid)
              const { useSyncQueueStore } = await import('@/stores')
              useSyncQueueStore.getState().decrementPendingCount()
            }
          } catch {
            // Failed to sync - will be synced later by the queue processor
            console.log('Failed to sync immediately, will retry later')
          }
        }

        return { success: true, clientUuid }
      } catch (error) {
        console.error('Failed to save set log:', error)
        return { success: false, clientUuid }
      }
    },
    [isOnline, incrementPendingCount]
  )

  const getLogsForExercise = useCallback(async (plannedExerciseId: string) => {
    return getSetLogsForExercise(plannedExerciseId)
  }, [])

  return { logSet, getLogsForExercise }
}

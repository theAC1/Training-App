import { openDB, type IDBPDatabase } from 'idb'
import {
  DB_NAME,
  DB_VERSION,
  type TrainingAppDB,
  type OfflineSetLog,
  type CachedSession,
  type CachedExercise,
  type SyncStatus,
} from './schemas'

let dbInstance: IDBPDatabase<TrainingAppDB> | null = null

export async function getDB(): Promise<IDBPDatabase<TrainingAppDB>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<TrainingAppDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // SetLogs store for offline logging
      if (!db.objectStoreNames.contains('setLogs')) {
        const setLogsStore = db.createObjectStore('setLogs', {
          keyPath: 'client_uuid',
        })
        setLogsStore.createIndex('by-sync-status', 'syncStatus')
        setLogsStore.createIndex('by-planned-exercise', 'planned_exercise_id')
        setLogsStore.createIndex('by-athlete', 'athlete_id')
        setLogsStore.createIndex('by-logged-at', 'logged_at')
      }

      // Sessions store for offline access
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionsStore = db.createObjectStore('sessions', {
          keyPath: 'id',
        })
        sessionsStore.createIndex('by-mesocycle', 'mesocycle_id')
        sessionsStore.createIndex('by-cached-at', 'cachedAt')
      }

      // Exercises store for offline access
      if (!db.objectStoreNames.contains('exercises')) {
        const exercisesStore = db.createObjectStore('exercises', {
          keyPath: 'id',
        })
        exercisesStore.createIndex('by-cached-at', 'cachedAt')
        exercisesStore.createIndex('by-category', 'categories', { multiEntry: true })
      }

      // Sync metadata store
      if (!db.objectStoreNames.contains('syncMeta')) {
        db.createObjectStore('syncMeta', { keyPath: 'key' })
      }
    },
  })

  return dbInstance
}

// Set Logs Operations
export async function saveSetLog(log: OfflineSetLog): Promise<void> {
  const db = await getDB()
  await db.put('setLogs', log)
}

export async function getSetLogByClientUuid(clientUuid: string): Promise<OfflineSetLog | undefined> {
  const db = await getDB()
  return db.get('setLogs', clientUuid)
}

export async function getPendingSetLogs(): Promise<OfflineSetLog[]> {
  const db = await getDB()
  return db.getAllFromIndex('setLogs', 'by-sync-status', 'pending')
}

export async function getFailedSetLogs(): Promise<OfflineSetLog[]> {
  const db = await getDB()
  return db.getAllFromIndex('setLogs', 'by-sync-status', 'failed')
}

export async function updateSetLogSyncStatus(
  clientUuid: string,
  status: SyncStatus,
  error?: string
): Promise<void> {
  const db = await getDB()
  const log = await db.get('setLogs', clientUuid)
  if (log) {
    log.syncStatus = status
    if (error) {
      log.lastError = error
      log.retryCount = (log.retryCount || 0) + 1
    }
    await db.put('setLogs', log)
  }
}

export async function deleteSetLog(clientUuid: string): Promise<void> {
  const db = await getDB()
  await db.delete('setLogs', clientUuid)
}

export async function getSetLogsForExercise(plannedExerciseId: string): Promise<OfflineSetLog[]> {
  const db = await getDB()
  return db.getAllFromIndex('setLogs', 'by-planned-exercise', plannedExerciseId)
}

export async function countPendingLogs(): Promise<number> {
  const db = await getDB()
  const pending = await db.countFromIndex('setLogs', 'by-sync-status', 'pending')
  const failed = await db.countFromIndex('setLogs', 'by-sync-status', 'failed')
  return pending + failed
}

// Session Operations
export async function cacheSession(session: CachedSession): Promise<void> {
  const db = await getDB()
  await db.put('sessions', {
    ...session,
    cachedAt: new Date().toISOString(),
  })
}

export async function getCachedSession(sessionId: string): Promise<CachedSession | undefined> {
  const db = await getDB()
  return db.get('sessions', sessionId)
}

export async function getCachedSessionsForMesocycle(mesocycleId: string): Promise<CachedSession[]> {
  const db = await getDB()
  return db.getAllFromIndex('sessions', 'by-mesocycle', mesocycleId)
}

export async function deleteCachedSession(sessionId: string): Promise<void> {
  const db = await getDB()
  await db.delete('sessions', sessionId)
}

export async function clearOldSessionCache(maxAgeDays: number = 7): Promise<void> {
  const db = await getDB()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - maxAgeDays)

  const tx = db.transaction('sessions', 'readwrite')
  const index = tx.store.index('by-cached-at')
  let cursor = await index.openCursor()

  while (cursor) {
    if (new Date(cursor.value.cachedAt) < cutoff) {
      await cursor.delete()
    }
    cursor = await cursor.continue()
  }

  await tx.done
}

// Exercise Operations
export async function cacheExercise(exercise: CachedExercise): Promise<void> {
  const db = await getDB()
  await db.put('exercises', {
    ...exercise,
    cachedAt: new Date().toISOString(),
  })
}

export async function cacheExercises(exercises: CachedExercise[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('exercises', 'readwrite')
  const now = new Date().toISOString()

  for (const exercise of exercises) {
    await tx.store.put({
      ...exercise,
      cachedAt: now,
    })
  }

  await tx.done
}

export async function getCachedExercise(exerciseId: string): Promise<CachedExercise | undefined> {
  const db = await getDB()
  return db.get('exercises', exerciseId)
}

export async function getAllCachedExercises(): Promise<CachedExercise[]> {
  const db = await getDB()
  return db.getAll('exercises')
}

// Sync Meta Operations
export async function getLastSyncTime(key: string): Promise<string | null> {
  const db = await getDB()
  const meta = await db.get('syncMeta', key)
  return meta?.lastSync ?? null
}

export async function setLastSyncTime(key: string): Promise<void> {
  const db = await getDB()
  await db.put('syncMeta', {
    key,
    lastSync: new Date().toISOString(),
    version: 1,
  })
}

// Utility: Generate client UUID
export function generateClientUuid(): string {
  return crypto.randomUUID()
}

// Clear all data (for logout)
export async function clearAllOfflineData(): Promise<void> {
  const db = await getDB()
  await Promise.all([
    db.clear('setLogs'),
    db.clear('sessions'),
    db.clear('exercises'),
    db.clear('syncMeta'),
  ])
}

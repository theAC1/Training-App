import type { DBSchema } from 'idb'
import type { Database } from '../database.types'

type SetLogRow = Database['public']['Tables']['set_logs']['Row']
type SessionRow = Database['public']['Tables']['sessions']['Row']
type ExerciseRow = Database['public']['Tables']['exercises']['Row']
type PlannedExerciseRow = Database['public']['Tables']['planned_exercises']['Row']
type SessionBlockRow = Database['public']['Tables']['session_blocks']['Row']

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed'

export interface OfflineSetLog extends Omit<SetLogRow, 'id' | 'synced_at' | 'created_at'> {
  id?: string
  syncStatus: SyncStatus
  retryCount: number
  lastError?: string
  createdAt: string
}

export interface CachedSession extends SessionRow {
  blocks?: CachedSessionBlock[]
  cachedAt: string
}

export interface CachedSessionBlock extends SessionBlockRow {
  exercises?: CachedPlannedExercise[]
}

export interface CachedPlannedExercise extends PlannedExerciseRow {
  exercise?: ExerciseRow
}

export interface CachedExercise extends ExerciseRow {
  cachedAt: string
}

export interface TrainingAppDB extends DBSchema {
  setLogs: {
    key: string // client_uuid
    value: OfflineSetLog
    indexes: {
      'by-sync-status': SyncStatus
      'by-planned-exercise': string
      'by-athlete': string
      'by-logged-at': string
    }
  }
  sessions: {
    key: string // session id
    value: CachedSession
    indexes: {
      'by-mesocycle': string
      'by-cached-at': string
    }
  }
  exercises: {
    key: string // exercise id
    value: CachedExercise
    indexes: {
      'by-cached-at': string
      'by-category': string
    }
  }
  syncMeta: {
    key: string
    value: {
      key: string
      lastSync: string
      version: number
    }
  }
}

export const DB_NAME = 'training-app-offline'
export const DB_VERSION = 1

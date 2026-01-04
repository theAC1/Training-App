import { create } from 'zustand'
import type { CachedSession, CachedExercise } from '@/lib/indexeddb'

interface OfflineDataState {
  sessions: Map<string, CachedSession>
  exercises: Map<string, CachedExercise>
  isLoading: boolean
  lastCacheUpdate: Date | null

  // Actions
  setSession: (session: CachedSession) => void
  setSessions: (sessions: CachedSession[]) => void
  getSession: (id: string) => CachedSession | undefined
  removeSession: (id: string) => void

  setExercise: (exercise: CachedExercise) => void
  setExercises: (exercises: CachedExercise[]) => void
  getExercise: (id: string) => CachedExercise | undefined

  setIsLoading: (loading: boolean) => void
  setLastCacheUpdate: (date: Date) => void
  clearAll: () => void
}

export const useOfflineDataStore = create<OfflineDataState>((set, get) => ({
  sessions: new Map(),
  exercises: new Map(),
  isLoading: false,
  lastCacheUpdate: null,

  setSession: (session) =>
    set((state) => {
      const newSessions = new Map(state.sessions)
      newSessions.set(session.id, session)
      return { sessions: newSessions, lastCacheUpdate: new Date() }
    }),

  setSessions: (sessions) =>
    set(() => {
      const newSessions = new Map<string, CachedSession>()
      sessions.forEach((s) => newSessions.set(s.id, s))
      return { sessions: newSessions, lastCacheUpdate: new Date() }
    }),

  getSession: (id) => get().sessions.get(id),

  removeSession: (id) =>
    set((state) => {
      const newSessions = new Map(state.sessions)
      newSessions.delete(id)
      return { sessions: newSessions }
    }),

  setExercise: (exercise) =>
    set((state) => {
      const newExercises = new Map(state.exercises)
      newExercises.set(exercise.id, exercise)
      return { exercises: newExercises }
    }),

  setExercises: (exercises) =>
    set(() => {
      const newExercises = new Map<string, CachedExercise>()
      exercises.forEach((e) => newExercises.set(e.id, e))
      return { exercises: newExercises }
    }),

  getExercise: (id) => get().exercises.get(id),

  setIsLoading: (loading) => set({ isLoading: loading }),
  setLastCacheUpdate: (date) => set({ lastCacheUpdate: date }),

  clearAll: () =>
    set({
      sessions: new Map(),
      exercises: new Map(),
      isLoading: false,
      lastCacheUpdate: null,
    }),
}))

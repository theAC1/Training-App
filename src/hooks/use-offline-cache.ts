'use client'

import { useCallback, useEffect } from 'react'
import { useOfflineDataStore } from '@/stores'
import { useOnlineStatus } from './use-online-status'
import {
  cacheSession,
  getCachedSession,
  cacheExercises,
  getAllCachedExercises,
  clearOldSessionCache,
  type CachedSession,
  type CachedExercise,
} from '@/lib/indexeddb'

export function useOfflineCache() {
  const { isOnline } = useOnlineStatus()
  const {
    sessions,
    exercises,
    isLoading,
    setSession,
    setSessions,
    setExercise,
    setExercises,
    setIsLoading,
    getSession,
    getExercise,
    clearAll,
  } = useOfflineDataStore()

  // Load cached data on mount
  useEffect(() => {
    async function loadCachedData() {
      setIsLoading(true)
      try {
        const cachedExercises = await getAllCachedExercises()
        if (cachedExercises.length > 0) {
          setExercises(cachedExercises)
        }
      } catch (error) {
        console.error('Failed to load cached data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCachedData()
  }, [setExercises, setIsLoading])

  // Cache a session with its blocks and exercises
  const cacheSessionData = useCallback(
    async (session: CachedSession) => {
      try {
        await cacheSession(session)
        setSession(session)
      } catch (error) {
        console.error('Failed to cache session:', error)
      }
    },
    [setSession]
  )

  // Get session from cache (memory first, then IndexedDB)
  const getSessionData = useCallback(
    async (sessionId: string): Promise<CachedSession | undefined> => {
      // Try memory first
      const memorySession = getSession(sessionId)
      if (memorySession) {
        return memorySession
      }

      // Try IndexedDB
      try {
        const cachedSession = await getCachedSession(sessionId)
        if (cachedSession) {
          setSession(cachedSession)
          return cachedSession
        }
      } catch (error) {
        console.error('Failed to get cached session:', error)
      }

      return undefined
    },
    [getSession, setSession]
  )

  // Cache exercises
  const cacheExerciseData = useCallback(
    async (exerciseList: CachedExercise[]) => {
      try {
        await cacheExercises(exerciseList)
        setExercises(exerciseList)
      } catch (error) {
        console.error('Failed to cache exercises:', error)
      }
    },
    [setExercises]
  )

  // Cleanup old cache periodically
  useEffect(() => {
    if (isOnline) {
      clearOldSessionCache(7).catch((error) => {
        console.error('Failed to clear old cache:', error)
      })
    }
  }, [isOnline])

  return {
    sessions: Array.from(sessions.values()),
    exercises: Array.from(exercises.values()),
    isLoading,
    cacheSessionData,
    getSessionData,
    cacheExerciseData,
    getExercise,
    clearAll,
  }
}

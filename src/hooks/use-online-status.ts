'use client'

import { useEffect } from 'react'
import { useOnlineStatusStore } from '@/stores'

export function useOnlineStatus() {
  const { isOnline, lastOnlineAt, setOnline } = useOnlineStatusStore()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    // Set initial state
    setOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline])

  return { isOnline, lastOnlineAt }
}

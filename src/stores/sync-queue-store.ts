import { create } from 'zustand'

interface SyncQueueState {
  pendingCount: number
  isSyncing: boolean
  lastSyncAt: Date | null
  lastError: string | null
  currentlySyncing: string[]

  // Actions
  setPendingCount: (count: number) => void
  incrementPendingCount: () => void
  decrementPendingCount: () => void
  setIsSyncing: (syncing: boolean) => void
  setLastSyncAt: (date: Date | null) => void
  setLastError: (error: string | null) => void
  addToSyncing: (clientUuid: string) => void
  removeFromSyncing: (clientUuid: string) => void
  reset: () => void
}

export const useSyncQueueStore = create<SyncQueueState>((set) => ({
  pendingCount: 0,
  isSyncing: false,
  lastSyncAt: null,
  lastError: null,
  currentlySyncing: [],

  setPendingCount: (count) => set({ pendingCount: count }),
  incrementPendingCount: () => set((state) => ({ pendingCount: state.pendingCount + 1 })),
  decrementPendingCount: () =>
    set((state) => ({ pendingCount: Math.max(0, state.pendingCount - 1) })),
  setIsSyncing: (syncing) => set({ isSyncing: syncing }),
  setLastSyncAt: (date) => set({ lastSyncAt: date }),
  setLastError: (error) => set({ lastError: error }),
  addToSyncing: (clientUuid) =>
    set((state) => ({
      currentlySyncing: [...state.currentlySyncing, clientUuid],
    })),
  removeFromSyncing: (clientUuid) =>
    set((state) => ({
      currentlySyncing: state.currentlySyncing.filter((id) => id !== clientUuid),
    })),
  reset: () =>
    set({
      pendingCount: 0,
      isSyncing: false,
      lastSyncAt: null,
      lastError: null,
      currentlySyncing: [],
    }),
}))

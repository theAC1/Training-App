import { create } from 'zustand'

interface OnlineStatusState {
  isOnline: boolean
  lastOnlineAt: Date | null
  setOnline: (online: boolean) => void
}

export const useOnlineStatusStore = create<OnlineStatusState>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastOnlineAt: null,
  setOnline: (online) =>
    set((state) => ({
      isOnline: online,
      lastOnlineAt: online ? new Date() : state.lastOnlineAt,
    })),
}))

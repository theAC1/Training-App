'use client'

import { BottomNav } from './bottom-nav'
import { SyncStatus } from './sync-status'
import { OfflineProvider } from './offline-provider'
import type { UserRole } from '@/lib/database.types'

interface AppShellProps {
  children: React.ReactNode
  userRole: UserRole
}

export function AppShell({ children, userRole }: AppShellProps) {
  return (
    <OfflineProvider>
      <div className="flex min-h-screen flex-col pb-20">
        {/* Floating sync status indicator */}
        <div className="fixed right-4 top-4 z-50">
          <SyncStatus />
        </div>
        <main className="flex-1">{children}</main>
        <BottomNav userRole={userRole} />
      </div>
    </OfflineProvider>
  )
}

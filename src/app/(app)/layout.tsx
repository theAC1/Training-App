import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/layout/bottom-nav'
import type { UserRole } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile for role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: 'trainer' | 'athlete' } | null }

  const userRole: UserRole = profile?.role || 'athlete'

  return (
    <div className="flex min-h-screen flex-col pb-20">
      <main className="flex-1">{children}</main>
      <BottomNav userRole={userRole} />
    </div>
  )
}

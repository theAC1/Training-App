import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Calendar } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Mesocycle {
  id: string
  name: string
  duration_weeks: number
  status: 'draft' | 'active' | 'completed'
  profiles?: { name: string } | null
}

export default async function PlanPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = (await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()) as { data: { role: string } | null }

  // Only trainers can access this page
  if (profile?.role !== 'trainer') {
    redirect('/dashboard')
  }

  // Fetch mesocycles
  const { data: mesocycles } = (await supabase
    .from('mesocycles')
    .select(
      `
      *,
      profiles:athlete_id (name)
    `
    )
    .order('created_at', { ascending: false })) as { data: Mesocycle[] | null }

  return (
    <>
      <Header
        title="Planung"
        rightAction={
          <Button asChild size="icon" variant="ghost">
            <Link href="/plan/new">
              <Plus className="h-5 w-5" />
              <span className="sr-only">Neuer Mesozyklus</span>
            </Link>
          </Button>
        }
      />
      <div className="p-4">
        {(!mesocycles || mesocycles.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-center text-muted-foreground">
                Noch keine Mesozyklen vorhanden.
              </p>
              <Button asChild className="mt-4">
                <Link href="/plan/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Ersten Mesozyklus erstellen
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {mesocycles && mesocycles.length > 0 && (
          <div className="space-y-3">
            {mesocycles.map((meso) => (
              <Link key={meso.id} href={`/plan/${meso.id}`}>
                <Card className="transition-colors hover:bg-accent">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{meso.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {meso.profiles?.name || 'Kein Athlet'} •{' '}
                          {meso.duration_weeks} Wochen
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          meso.status === 'active'
                            ? 'bg-success/10 text-success'
                            : meso.status === 'completed'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-warning/10 text-warning'
                        }`}
                      >
                        {meso.status === 'active'
                          ? 'Aktiv'
                          : meso.status === 'completed'
                            ? 'Abgeschlossen'
                            : 'Entwurf'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

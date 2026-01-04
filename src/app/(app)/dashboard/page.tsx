import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dumbbell, Flame, Trophy, Calendar, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Mesocycle {
  id: string
  name: string
  status: 'draft' | 'active' | 'completed'
  duration_weeks: number
  phase: string | null
}

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = (await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()) as { data: { role: string; name: string } | null }

  const isTrainer = profile?.role === 'trainer'
  const greeting = getGreeting()

  // Fetch data based on role
  let athleteCount = 0
  let activeMesocycleCount = 0
  let athleteMesocycles: Mesocycle[] = []

  if (isTrainer) {
    // Get athlete count
    const { count: aCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'athlete')
    athleteCount = aCount || 0

    // Get active mesocycle count
    const { count: mCount } = await supabase
      .from('mesocycles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
    activeMesocycleCount = mCount || 0
  } else {
    // Athlete: Get assigned mesocycles
    const { data: mesocycles } = await supabase
      .from('mesocycles')
      .select('id, name, status, duration_weeks, phase')
      .eq('athlete_id', user.id)
      .in('status', ['active', 'draft'])
      .order('created_at', { ascending: false })
      .limit(3)

    athleteMesocycles = (mesocycles as Mesocycle[]) || []
  }

  return (
    <>
      <Header title="Dashboard" />
      <div className="space-y-4 p-4">
        <div>
          <h2 className="text-2xl font-bold">
            {greeting}, {profile?.name || 'Athlet'}!
          </h2>
          <p className="text-muted-foreground">
            {isTrainer
              ? 'Verwalte deine Athleten und Trainingspläne'
              : 'Bereit für dein Training?'}
          </p>
        </div>

        {!isTrainer && (
          <>
            {/* Streak Card */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="rounded-full bg-primary/10 p-3">
                  <Flame className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Streak</CardTitle>
                  <p className="text-2xl font-bold">0 Tage</p>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Starte dein erstes Training!
                </p>
              </CardContent>
            </Card>

            {/* PBs Card */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="rounded-full bg-warning/10 p-3">
                  <Trophy className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <CardTitle className="text-base">Personal Bests</CardTitle>
                  <p className="text-2xl font-bold">0 PBs</p>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Deine Bestleistungen erscheinen hier
                </p>
              </CardContent>
            </Card>

            {/* Assigned Mesocycles */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="rounded-full bg-accent p-3">
                  <Calendar className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">Meine Trainingspläne</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {athleteMesocycles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Noch keine Trainingspläne zugewiesen. Dein Trainer wird bald
                    einen Plan erstellen.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {athleteMesocycles.map((meso) => (
                      <div
                        key={meso.id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                      >
                        <div>
                          <p className="font-medium">{meso.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {meso.duration_weeks} Wochen
                            {meso.phase && ` • ${meso.phase}`}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            meso.status === 'active'
                              ? 'bg-success/10 text-success'
                              : 'bg-warning/10 text-warning'
                          }`}
                        >
                          {meso.status === 'active' ? 'Aktiv' : 'Entwurf'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next Session Card */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="rounded-full bg-accent p-3">
                  <Dumbbell className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-base">Nächstes Training</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {athleteMesocycles.length > 0
                    ? 'Wähle eine Session aus deinem Trainingsplan.'
                    : 'Noch kein Training geplant.'}
                </p>
                {athleteMesocycles.length > 0 && (
                  <Button asChild className="mt-3 w-full">
                    <Link href="/session">
                      Training starten
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {isTrainer && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <p className="text-3xl font-bold">{athleteCount}</p>
                  <p className="text-sm text-muted-foreground">Athleten</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <p className="text-3xl font-bold">{activeMesocycleCount}</p>
                  <p className="text-sm text-muted-foreground">Aktive Pläne</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Schnellzugriff</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline">
                  <Link href="/plan/new">Neuer Plan</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/athletes">Athleten</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/exercises">Übungen</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/plan">Alle Pläne</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Erste Schritte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  1. Erstelle Übungen unter &quot;Übungen&quot;
                </p>
                <p className="text-sm text-muted-foreground">
                  2. Lade Athleten ein unter &quot;Athleten&quot;
                </p>
                <p className="text-sm text-muted-foreground">
                  3. Erstelle Trainingspläne unter &quot;Planung&quot;
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

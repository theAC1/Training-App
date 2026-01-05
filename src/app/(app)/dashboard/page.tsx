import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { CardHeader, CardTitle } from '@/components/ui/card'
import { FloatingCard } from '@/components/ui/FloatingCard'
import { Button } from '@/components/ui/button'
import { Dumbbell, Flame, Trophy, Calendar, ChevronRight, ListTodo, Users } from 'lucide-react'
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
      <div className="space-y-4 p-4 pb-24">
        {/* Greeting Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/30 p-6 shadow-floating">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold tracking-tight">
              {greeting}, <br />
              <span className="text-primary">{profile?.name || 'Athlet'}!</span>
            </h2>
            <p className="mt-2 text-muted-foreground font-medium">
              {isTrainer
                ? 'Verwalte deine Athleten und Trainingspläne'
                : 'Bereit für dein Training?'}
            </p>
          </div>
          {/* Decorative Background Element */}
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        </div>

        {!isTrainer && (
          <>
            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Streak Card */}
              <FloatingCard className="flex flex-col items-center justify-center text-center">
                <div className="mb-2 rounded-full bg-primary/10 p-3 shadow-sm">
                  <Flame className="h-6 w-6 text-primary" />
                </div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Streak</p>
              </FloatingCard>

              {/* PBs Card */}
              <FloatingCard className="flex flex-col items-center justify-center text-center">
                <div className="mb-2 rounded-full bg-warning/10 p-3 shadow-sm">
                  <Trophy className="h-6 w-6 text-warning" />
                </div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">PBs</p>
              </FloatingCard>
            </div>

            {/* Next Session Card (Prominent) */}
            <FloatingCard gradient className="relative overflow-hidden border-primary/20">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-primary p-4 shadow-lg text-primary-foreground">
                  <Dumbbell className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Nächstes Training</h3>
                  <p className="text-sm text-muted-foreground">
                    {athleteMesocycles.length > 0 ? 'Weiter geht\'s!' : 'Starte jetzt'}
                  </p>
                </div>
              </div>

              {athleteMesocycles.length > 0 ? (
                <Button asChild className="mt-6 w-full shadow-lg" size="lg">
                  <Link href="/session">
                    Training starten
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground bg-background/50 p-3 rounded-lg border border-border/50">
                  Noch kein Training geplant. Warte auf deinen Trainer.
                </p>
              )}
            </FloatingCard>

            {/* Assigned Mesocycles */}
            <div className="space-y-3">
              <h3 className="px-1 text-lg font-semibold">Deine Pläne</h3>
              {athleteMesocycles.length === 0 ? (
                <FloatingCard>
                  <div className="flex flex-col items-center text-center gap-2">
                    <Calendar className="h-10 w-10 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Keine aktiven Pläne</p>
                  </div>
                </FloatingCard>
              ) : (
                athleteMesocycles.map((meso) => (
                  <FloatingCard key={meso.id} className="p-4 flex items-center justify-between hover:bg-accent/50 cursor-pointer transition-colors group">
                    <div>
                      <p className="font-bold group-hover:text-primary transition-colors">{meso.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{meso.duration_weeks} Wochen</span>
                        {meso.phase && <span className="w-1 h-1 rounded-full bg-muted-foreground" />}
                        {meso.phase && <span>{meso.phase}</span>}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium border ${meso.status === 'active'
                        ? 'bg-success/10 text-success border-success/20'
                        : 'bg-warning/10 text-warning border-warning/20'
                        }`}
                    >
                      {meso.status === 'active' ? 'Aktiv' : 'Entwurf'}
                    </span>
                  </FloatingCard>
                ))
              )}
            </div>
          </>
        )}

        {isTrainer && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <FloatingCard className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-card to-primary/5">
                <p className="text-4xl font-bold text-foreground">{athleteCount}</p>
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mt-1">Athleten</p>
              </FloatingCard>
              <FloatingCard className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-card to-primary/5">
                <p className="text-4xl font-bold text-foreground">{activeMesocycleCount}</p>
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mt-1">Aktive Pläne</p>
              </FloatingCard>
            </div>

            {/* Quick Actions */}
            <FloatingCard>
              <CardHeader className="p-0 mb-4">
                <CardTitle>Schnellzugriff</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-2 gap-3">
                <Button asChild variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:border-primary/50 hover:bg-primary/5">
                  <Link href="/plan/new">
                    <ListTodo className="h-6 w-6 mb-1" />
                    Neuer Plan
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:border-primary/50 hover:bg-primary/5">
                  <Link href="/athletes">
                    <Users className="h-6 w-6 mb-1" />
                    Athleten
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:border-primary/50 hover:bg-primary/5">
                  <Link href="/exercises">
                    <Dumbbell className="h-6 w-6 mb-1" />
                    Übungen
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:border-primary/50 hover:bg-primary/5">
                  <Link href="/plan">
                    <Calendar className="h-6 w-6 mb-1" />
                    Alle Pläne
                  </Link>
                </Button>
              </div>
            </FloatingCard>
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

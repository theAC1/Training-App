import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dumbbell, Flame, Trophy, Calendar, ChevronRight, Clock, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface Mesocycle {
  id: string
  name: string
  status: 'draft' | 'active' | 'completed'
  duration_weeks: number
  phase: string | null
}

interface CompletedSession {
  id: string
  name: string | null
  week_number: number
  completed_at: string
  mesocycles: {
    name: string
  }
}

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
  let completedSessions: CompletedSession[] = []
  let totalWorkouts = 0

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: mesocycles } = await (supabase as any)
      .from('mesocycles')
      .select('id, name, status, duration_weeks, phase')
      .eq('athlete_id', user.id)
      .in('status', ['active', 'draft'])
      .order('created_at', { ascending: false })
      .limit(3)

    athleteMesocycles = (mesocycles as Mesocycle[]) || []

    // Get completed sessions for history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sessions } = await (supabase as any)
      .from('sessions')
      .select(`
        id,
        name,
        week_number,
        completed_at,
        mesocycles!inner(name, athlete_id)
      `)
      .eq('mesocycles.athlete_id', user.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(5)

    completedSessions = (sessions as CompletedSession[]) || []

    // Get total workout count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from('sessions')
      .select('id, mesocycles!inner(athlete_id)', { count: 'exact', head: true })
      .eq('mesocycles.athlete_id', user.id)
      .not('completed_at', 'is', null)

    totalWorkouts = count || 0
  }

  // Calculate streak (simplified: consecutive days with completed workouts)
  const streak = calculateStreak(completedSessions)

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
            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Streak Card */}
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-4">
                  <Flame className={`h-8 w-8 ${streak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                  <p className="text-2xl font-bold mt-1">{streak}</p>
                  <p className="text-xs text-muted-foreground">Tage Streak</p>
                </CardContent>
              </Card>

              {/* Total Workouts */}
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-4">
                  <Trophy className={`h-8 w-8 ${totalWorkouts > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                  <p className="text-2xl font-bold mt-1">{totalWorkouts}</p>
                  <p className="text-xs text-muted-foreground">Workouts</p>
                </CardContent>
              </Card>
            </div>

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
                      <Link
                        key={meso.id}
                        href={`/plan/${meso.id}`}
                        className="flex items-center justify-between rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted"
                      >
                        <div>
                          <p className="font-medium">{meso.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {meso.duration_weeks} Wochen
                            {meso.phase && ` • ${meso.phase}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              meso.status === 'active'
                                ? 'bg-success/10 text-success'
                                : 'bg-warning/10 text-warning'
                            }`}
                          >
                            {meso.status === 'active' ? 'Aktiv' : 'Entwurf'}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next Session Card */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="rounded-full bg-primary/10 p-3">
                  <Dumbbell className="h-6 w-6 text-primary" />
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
                    <Link href={`/plan/${athleteMesocycles[0].id}`}>
                      Training starten
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Workout History */}
            {completedSessions.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <div className="rounded-full bg-green-100 p-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">Letzte Workouts</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {completedSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between border-b border-muted pb-2 last:border-0 last:pb-0"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {session.name || `Woche ${session.week_number}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.mesocycles.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatRelativeDate(session.completed_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
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

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Heute'
  if (diffDays === 1) return 'Gestern'
  if (diffDays < 7) return `vor ${diffDays} Tagen`
  if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)} Wochen`
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

function calculateStreak(sessions: CompletedSession[]): number {
  if (sessions.length === 0) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get unique dates of completed workouts
  const workoutDates = new Set(
    sessions.map((s) => {
      const d = new Date(s.completed_at)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    })
  )

  // Check if there's a workout today or yesterday (to maintain streak)
  const todayTime = today.getTime()
  const yesterdayTime = todayTime - 24 * 60 * 60 * 1000

  if (!workoutDates.has(todayTime) && !workoutDates.has(yesterdayTime)) {
    return 0
  }

  // Count consecutive days
  let streak = 0
  let currentDay = workoutDates.has(todayTime) ? todayTime : yesterdayTime

  while (workoutDates.has(currentDay)) {
    streak++
    currentDay -= 24 * 60 * 60 * 1000
  }

  return streak
}

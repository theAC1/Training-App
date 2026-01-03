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

interface Session {
  id: string
  name: string | null
  week_number: number
  completed_at: string | null
}

interface SetLogWithExercise {
  id: string
  reps_completed: number
  weight_used: number | null
  logged_at: string
  planned_exercises: {
    exercise_id: string
    exercises: {
      id: string
      name: string
    }
  }
}

interface SessionWithCompletion {
  completed_at: string | null
}

async function getAthleteStats(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  // Get all set logs for the athlete
  const { data: setLogs } = await supabase
    .from('set_logs')
    .select(`
      id,
      reps_completed,
      weight_used,
      logged_at,
      planned_exercises (
        exercise_id,
        exercises (id, name)
      )
    `)
    .eq('athlete_id', userId)
    .order('logged_at', { ascending: false })

  const typedSetLogs = setLogs as unknown as SetLogWithExercise[]

  // Calculate Personal Bests
  const pbsByExercise: Record<string, { exerciseName: string; weight: number; reps: number; date: string }> = {}

  for (const log of typedSetLogs || []) {
    if (!log.weight_used || !log.planned_exercises?.exercises) continue
    const exerciseId = log.planned_exercises.exercise_id
    const exerciseName = log.planned_exercises.exercises.name
    const currentPB = pbsByExercise[exerciseId]

    if (!currentPB || log.weight_used > currentPB.weight) {
      pbsByExercise[exerciseId] = {
        exerciseName,
        weight: log.weight_used,
        reps: log.reps_completed,
        date: log.logged_at,
      }
    }
  }

  const personalBests = Object.entries(pbsByExercise).map(([exerciseId, data]) => ({
    exerciseId,
    ...data,
  }))

  // Get completed sessions for streak
  const { data: completedSessions } = await supabase
    .from('sessions')
    .select(`
      completed_at,
      mesocycles!inner (athlete_id)
    `)
    .eq('mesocycles.athlete_id', userId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })

  // Calculate streak
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (completedSessions && completedSessions.length > 0) {
    const typedSessions = completedSessions as unknown as SessionWithCompletion[]
    const completionDates = typedSessions
      .filter((s) => s.completed_at)
      .map((s) => {
        const date = new Date(s.completed_at!)
        date.setHours(0, 0, 0, 0)
        return date.getTime()
      })
      .filter((date, index, self) => self.indexOf(date) === index)
      .sort((a, b) => b - a)

    const todayTime = today.getTime()
    const yesterdayTime = todayTime - 24 * 60 * 60 * 1000

    if (completionDates.includes(todayTime)) {
      streak = 1
      let checkDate = yesterdayTime
      for (const date of completionDates.slice(1)) {
        if (date === checkDate) {
          streak++
          checkDate -= 24 * 60 * 60 * 1000
        } else if (date < checkDate) {
          break
        }
      }
    } else if (completionDates.includes(yesterdayTime)) {
      streak = 1
      let checkDate = yesterdayTime - 24 * 60 * 60 * 1000
      for (const date of completionDates.slice(1)) {
        if (date === checkDate) {
          streak++
          checkDate -= 24 * 60 * 60 * 1000
        } else if (date < checkDate) {
          break
        }
      }
    }
  }

  // Recent PBs
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const recentPBs = personalBests.filter((pb) => new Date(pb.date) >= oneWeekAgo)

  return {
    personalBests: personalBests.slice(0, 5),
    recentPBs,
    streak,
    totalWorkouts: completedSessions?.length || 0,
    totalPBs: personalBests.length,
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
  let nextSessions: Session[] = []
  let stats = { personalBests: [] as { exerciseName: string; weight: number; reps: number }[], streak: 0, totalPBs: 0, totalWorkouts: 0, recentPBs: [] as { exerciseName: string }[] }

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

    // Get next uncompleted sessions
    if (athleteMesocycles.length > 0) {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, name, week_number, completed_at, mesocycle_id')
        .in('mesocycle_id', athleteMesocycles.map(m => m.id))
        .is('completed_at', null)
        .order('week_number', { ascending: true })
        .order('order_index', { ascending: true })
        .limit(3)

      nextSessions = (sessions as Session[]) || []
    }

    // Get stats
    stats = await getAthleteStats(supabase, user.id)
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
            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Streak Card */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-3 p-4">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Flame className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">Streak</CardTitle>
                    <p className="text-2xl font-bold">{stats.streak}</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.streak === 1 ? 'Tag' : 'Tage'}
                    </p>
                  </div>
                </CardHeader>
              </Card>

              {/* PBs Card */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-3 p-4">
                  <div className="rounded-full bg-warning/10 p-2">
                    <Trophy className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">PBs</CardTitle>
                    <p className="text-2xl font-bold">{stats.totalPBs}</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.recentPBs.length > 0
                        ? `+${stats.recentPBs.length} diese Woche`
                        : 'Personal Bests'}
                    </p>
                  </div>
                </CardHeader>
              </Card>
            </div>

            {/* Recent PBs */}
            {stats.personalBests.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-warning" />
                    Deine Bestleistungen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.personalBests.map((pb, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">{pb.exerciseName}</span>
                        <span className="font-medium">
                          {pb.weight}kg x {pb.reps}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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

            {/* Next Sessions Card */}
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
                {nextSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {athleteMesocycles.length > 0
                      ? 'Alle Sessions abgeschlossen!'
                      : 'Noch kein Training geplant.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {nextSessions.map((session) => (
                      <Button
                        key={session.id}
                        asChild
                        variant="outline"
                        className="w-full justify-between"
                      >
                        <Link href={`/session/${session.id}`}>
                          <span>
                            {session.name || `Woche ${session.week_number}`}
                          </span>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ))}
                  </div>
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

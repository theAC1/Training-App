'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FloatingCard } from '@/components/ui/FloatingCard'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Dumbbell,
  Trophy,
  AlertTriangle,
  Loader2,
  Home,
} from 'lucide-react'

interface ExerciseSummary {
  planned_exercise_id: string
  exercise_name: string
  sets_target: number
  sets_completed: number
  total_reps: number
  total_volume: number
  pain_flags: number
  logs: Array<{
    set_number: number
    reps_completed: number
    weight_used: number | null
    pain_flag: boolean
    logged_at: string
  }>
}

interface SummaryData {
  session: {
    id: string
    name: string | null
    week_number: number
    started_at: string | null
    completed_at: string | null
    notes: string | null
    mesocycle: { id: string; name: string } | null
  }
  totals: {
    duration_seconds: number | null
    sets_completed: number
    sets_target: number
    total_reps: number
    total_volume: number
    pain_flags: number
  }
  exercises: ExerciseSummary[]
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '–'
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) {
    return `${hours}h ${mins.toString().padStart(2, '0')}m`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}t`
  }
  return `${Math.round(volume)}kg`
}

export default function SessionSummaryPage() {
  const params = useParams()
  const sessionId = params.id as string
  const [data, setData] = useState<SummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/summary`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setError(body.error || 'Zusammenfassung konnte nicht geladen werden')
          return
        }
        const json = (await res.json()) as SummaryData
        setData(json)
      } catch {
        setError('Zusammenfassung konnte nicht geladen werden')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSummary()
  }, [sessionId])

  if (isLoading) {
    return (
      <>
        <Header
          title="Zusammenfassung"
          leftAction={
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          }
        />
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <Header
          title="Zusammenfassung"
          leftAction={
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          }
        />
        <div className="p-4">
          <FloatingCard>
            <CardContent className="py-8 text-center text-muted-foreground">
              {error || 'Keine Daten verfügbar'}
            </CardContent>
          </FloatingCard>
        </div>
      </>
    )
  }

  const { session, totals, exercises } = data
  const completion =
    totals.sets_target > 0
      ? Math.round((totals.sets_completed / totals.sets_target) * 100)
      : 0
  const title = session.name || `Woche ${session.week_number}`

  return (
    <>
      <Header
        title="Zusammenfassung"
        leftAction={
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        }
      />

      <div className="space-y-4 p-4">
        {/* Hero */}
        <FloatingCard gradient>
          <CardContent className="space-y-3 py-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Trophy className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Training abgeschlossen!</h2>
              <p className="text-sm text-muted-foreground">{title}</p>
              {session.mesocycle && (
                <p className="text-xs text-muted-foreground">
                  {session.mesocycle.name}
                </p>
              )}
            </div>
          </CardContent>
        </FloatingCard>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-3">
          <FloatingCard className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Dauer
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {formatDuration(totals.duration_seconds)}
            </p>
          </FloatingCard>

          <FloatingCard className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              Sätze
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {totals.sets_completed}
              <span className="text-base text-muted-foreground">
                /{totals.sets_target}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">{completion}% erledigt</p>
          </FloatingCard>

          <FloatingCard className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Dumbbell className="h-4 w-4" />
              Volumen
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {formatVolume(totals.total_volume)}
            </p>
            <p className="text-xs text-muted-foreground">
              {totals.total_reps} Wdh gesamt
            </p>
          </FloatingCard>

          <FloatingCard className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              Schmerz-Flags
            </div>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                totals.pain_flags > 0 ? 'text-yellow-600' : ''
              }`}
            >
              {totals.pain_flags}
            </p>
            <p className="text-xs text-muted-foreground">
              {totals.pain_flags === 0 ? 'alles gut' : 'bitte beachten'}
            </p>
          </FloatingCard>
        </div>

        {/* Exercises */}
        {exercises.length > 0 && (
          <FloatingCard>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Übungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {exercises.map((ex) => {
                const complete = ex.sets_completed >= ex.sets_target
                return (
                  <div
                    key={ex.planned_exercise_id}
                    className="rounded-lg border bg-background/40 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{ex.exercise_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ex.sets_completed}/{ex.sets_target} Sätze · {ex.total_reps} Wdh
                          {ex.total_volume > 0 && ` · ${formatVolume(ex.total_volume)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {ex.pain_flags > 0 && (
                          <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                            <AlertTriangle className="h-3 w-3" />
                            {ex.pain_flags}
                          </span>
                        )}
                        {complete ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            offen
                          </span>
                        )}
                      </div>
                    </div>
                    {ex.logs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {ex.logs.map((log) => (
                          <span
                            key={`${ex.planned_exercise_id}-${log.set_number}`}
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              log.pain_flag
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {log.reps_completed}
                            {log.weight_used ? `@${log.weight_used}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </FloatingCard>
        )}

        {/* Actions */}
        <div className="pt-2">
          <Button asChild size="lg" className="w-full h-14 text-lg font-bold shadow-lg">
            <Link href="/dashboard">
              <Home className="mr-2 h-5 w-5" />
              Zum Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </>
  )
}

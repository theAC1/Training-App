'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { SetLogger } from '@/components/training/set-logger'
import { RestTimer } from '@/components/training/rest-timer'
import { blockTypeLabels } from '@/lib/validations/plan'

interface Exercise {
  id: string
  name: string
  image_url: string
}

interface SetLog {
  id: string
  set_number: number
  reps_completed: number
  weight_used: number | null
  pain_flag: boolean
  notes: string | null
  logged_at: string
}

interface PlannedExercise {
  id: string
  exercise_id: string
  order_in_block: number
  sets_target: number
  reps_target: string
  weight_prescribed: number | null
  rir: number | null
  rest_time_default: number
  notes: string | null
  cluster_reps: number | null
  cluster_count: number | null
  intra_cluster_rest: number | null
  exercises: Exercise
  set_logs?: SetLog[]
}

interface SessionBlock {
  id: string
  block_type: 'single' | 'superset' | 'cluster'
  order_index: number
  rest_between_rounds: number | null
  notes: string | null
  planned_exercises: PlannedExercise[]
}

interface Session {
  id: string
  mesocycle_id: string
  week_number: number
  day_of_week: number | null
  name: string | null
  notes: string | null
  started_at: string | null
  completed_at: string | null
  mesocycles: {
    id: string
    name: string
    athlete_id: string
  }
  session_blocks: SessionBlock[]
}

export default function AthleteSessionPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [showTimer, setShowTimer] = useState(false)
  const [timerDuration, setTimerDuration] = useState(120)
  const [isCompleting, setIsCompleting] = useState(false)

  const loadSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${params.id}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/dashboard')
          return
        }
        throw new Error('Fehler beim Laden')
      }
      const data = await response.json()
      setSession(data)

      // Start session if not started
      if (!data.started_at) {
        await fetch(`/api/sessions/${params.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ started_at: new Date().toISOString() }),
        })
      }
    } catch {
      toast({
        title: 'Fehler',
        description: 'Session konnte nicht geladen werden',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [params.id, router, toast])

  // Load set logs for the session
  const loadSetLogs = useCallback(async () => {
    if (!session) return

    try {
      // Get all planned exercise IDs from this session
      const exerciseIds = session.session_blocks.flatMap((block) =>
        block.planned_exercises.map((pe) => pe.id)
      )

      // Fetch logs for each exercise
      const logsPromises = exerciseIds.map((id) =>
        fetch(`/api/set-logs?planned_exercise_id=${id}`).then((r) => r.json())
      )

      const logsResults = await Promise.all(logsPromises)

      // Update session with logs
      setSession((prev) => {
        if (!prev) return prev
        const updated = { ...prev }
        updated.session_blocks = prev.session_blocks.map((block) => ({
          ...block,
          planned_exercises: block.planned_exercises.map((pe, peIndex) => ({
            ...pe,
            set_logs: logsResults[
              prev.session_blocks
                .slice(0, prev.session_blocks.indexOf(block))
                .reduce((sum, b) => sum + b.planned_exercises.length, 0) +
                peIndex
            ] as SetLog[],
          })),
        }))
        return updated
      })
    } catch {
      console.error('Fehler beim Laden der Set Logs')
    }
  }, [session])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  useEffect(() => {
    if (session) {
      loadSetLogs()
    }
  }, [session?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSetLogged = useCallback(
    (restTime: number) => {
      setTimerDuration(restTime)
      setShowTimer(true)
      loadSetLogs()
    },
    [loadSetLogs]
  )

  const handleTimerComplete = useCallback(() => {
    setShowTimer(false)
  }, [])

  const handleCompleteSession = async () => {
    if (!session) return

    setIsCompleting(true)
    try {
      await fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_at: new Date().toISOString() }),
      })

      toast({
        title: 'Training abgeschlossen!',
        description: 'Gut gemacht! Dein Training wurde gespeichert.',
      })

      router.push('/dashboard')
    } catch {
      toast({
        title: 'Fehler',
        description: 'Session konnte nicht abgeschlossen werden',
        variant: 'destructive',
      })
    } finally {
      setIsCompleting(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Header title="Laden..." />
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  if (!session) {
    return null
  }

  const sortedBlocks = [...session.session_blocks].sort(
    (a, b) => a.order_index - b.order_index
  )
  const currentBlock = sortedBlocks[currentBlockIndex]
  const sortedExercises = currentBlock?.planned_exercises
    ? [...currentBlock.planned_exercises].sort(
        (a, b) => a.order_in_block - b.order_in_block
      )
    : []
  const currentExercise = sortedExercises[currentExerciseIndex]

  const totalExercises = sortedBlocks.reduce(
    (sum, block) => sum + block.planned_exercises.length,
    0
  )
  const currentGlobalIndex =
    sortedBlocks
      .slice(0, currentBlockIndex)
      .reduce((sum, block) => sum + block.planned_exercises.length, 0) +
    currentExerciseIndex +
    1

  const goToPrevious = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex((prev) => prev - 1)
    } else if (currentBlockIndex > 0) {
      setCurrentBlockIndex((prev) => prev - 1)
      const prevBlock = sortedBlocks[currentBlockIndex - 1]
      setCurrentExerciseIndex(prevBlock.planned_exercises.length - 1)
    }
  }

  const goToNext = () => {
    if (currentExerciseIndex < sortedExercises.length - 1) {
      setCurrentExerciseIndex((prev) => prev + 1)
    } else if (currentBlockIndex < sortedBlocks.length - 1) {
      setCurrentBlockIndex((prev) => prev + 1)
      setCurrentExerciseIndex(0)
    }
  }

  const canGoPrevious = currentBlockIndex > 0 || currentExerciseIndex > 0
  const canGoNext =
    currentBlockIndex < sortedBlocks.length - 1 ||
    currentExerciseIndex < sortedExercises.length - 1

  const completedSets = currentExercise?.set_logs?.length || 0
  const isExerciseComplete = completedSets >= currentExercise?.sets_target

  return (
    <>
      <Header
        title={session.name || `Woche ${session.week_number}`}
        leftAction={
          <Button asChild size="icon" variant="ghost">
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Zurück</span>
            </Link>
          </Button>
        }
        rightAction={
          <Button
            size="sm"
            variant="outline"
            onClick={handleCompleteSession}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Beenden'
            )}
          </Button>
        }
      />

      <div className="p-4 space-y-4 pb-24">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Übung {currentGlobalIndex} von {totalExercises}
          </span>
          <span className="rounded bg-muted px-2 py-0.5 text-xs">
            {blockTypeLabels[currentBlock?.block_type]}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(currentGlobalIndex / totalExercises) * 100}%` }}
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            size="icon"
            variant="ghost"
            onClick={goToPrevious}
            disabled={!canGoPrevious}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="text-center flex-1">
            <h2 className="text-xl font-bold">
              {currentExercise?.exercises?.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {currentExercise?.sets_target} x {currentExercise?.reps_target}
              {currentExercise?.weight_prescribed &&
                ` @ ${currentExercise.weight_prescribed}kg`}
              {currentExercise?.rir !== null &&
                ` • RIR ${currentExercise.rir}`}
            </p>
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={goToNext}
            disabled={!canGoNext}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Exercise Notes */}
        {currentExercise?.notes && (
          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <p className="text-sm text-muted-foreground">
                {currentExercise.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Rest Timer */}
        {showTimer && (
          <RestTimer
            duration={timerDuration}
            onComplete={handleTimerComplete}
            onSkip={() => setShowTimer(false)}
          />
        )}

        {/* Set Logger */}
        {currentExercise && (
          <SetLogger
            plannedExercise={currentExercise}
            completedSets={currentExercise.set_logs || []}
            onSetLogged={handleSetLogged}
          />
        )}

        {/* Exercise Status */}
        {isExerciseComplete && (
          <Card className="border-success/50 bg-success/10">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <p className="font-medium text-success">Übung abgeschlossen!</p>
                <p className="text-sm text-muted-foreground">
                  {canGoNext
                    ? 'Weiter zur nächsten Übung'
                    : 'Du kannst das Training beenden'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pain Warning if any set has pain flag */}
        {currentExercise?.set_logs?.some((log) => log.pain_flag) && (
          <Card className="border-warning/50 bg-warning/10">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium text-warning">Schmerzen gemeldet</p>
                <p className="text-sm text-muted-foreground">
                  Informiere deinen Trainer über die Schmerzen.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed Sets Summary */}
        {currentExercise?.set_logs && currentExercise.set_logs.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Abgeschlossene Sätze</h3>
              <div className="space-y-2">
                {currentExercise.set_logs
                  .sort((a, b) => a.set_number - b.set_number)
                  .map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-2 text-sm"
                    >
                      <span>Satz {log.set_number}</span>
                      <span className="font-medium">
                        {log.reps_completed} Wdh
                        {log.weight_used && ` @ ${log.weight_used}kg`}
                        {log.pain_flag && (
                          <AlertTriangle className="ml-2 inline h-4 w-4 text-warning" />
                        )}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

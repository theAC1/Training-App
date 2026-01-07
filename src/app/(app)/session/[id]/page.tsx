'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { useSetLogger } from '@/hooks/use-set-logger'
import { useOnlineStatus } from '@/hooks/use-online-status'
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  Dumbbell,
  Timer,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Pause,
  WifiOff,
  Trophy,
  Clock,
  BarChart3,
  History,
  X,
  Home,
} from 'lucide-react'
import Link from 'next/link'

interface Exercise {
  id: string
  name: string
  image_url: string | null
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
  exercises: Exercise
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

interface SetLog {
  setNumber: number
  repsCompleted: number
  weightUsed: number | null
  painFlag: boolean
  clientUuid: string
}

interface HistoricalLog {
  id: string
  set_number: number
  reps_completed: number
  weight_used: number | null
  logged_at: string
}

interface SessionSummary {
  duration: number // in seconds
  totalSets: number
  totalReps: number
  totalVolume: number // kg
  exercisesCompleted: number
  painFlags: number
}

export default function SessionExecutionPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { logSet } = useSetLogger()
  const { isOnline } = useOnlineStatus()
  const sessionId = params.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [completedSets, setCompletedSets] = useState<Map<string, SetLog[]>>(new Map())

  // Historical logs per exercise
  const [exerciseHistory, setExerciseHistory] = useState<Map<string, HistoricalLog[]>>(new Map())

  // Set input state
  const [repsInput, setRepsInput] = useState('')
  const [weightInput, setWeightInput] = useState('')
  const [painFlag, setPainFlag] = useState(false)
  const [isLoggingSet, setIsLoggingSet] = useState(false)

  // Rest timer state
  const [restTimeRemaining, setRestTimeRemaining] = useState(0)
  const [isResting, setIsResting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Session summary state
  const [showSummary, setShowSummary] = useState(false)
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)

  // Show history panel
  const [showHistory, setShowHistory] = useState(false)

  // Fetch session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`)
        if (res.ok) {
          const data = await res.json()
          setSession(data)

          // If session not started, auto-start it
          if (!data.started_at) {
            startSession()
            setSessionStartTime(new Date())
          } else {
            setSessionStartTime(new Date(data.started_at))
          }
        } else {
          toast({
            variant: 'destructive',
            title: 'Fehler',
            description: 'Session nicht gefunden',
          })
          router.push('/dashboard')
        }
      } catch {
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description: 'Konnte Session nicht laden',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSession()
  }, [sessionId, router, toast])

  // Fetch historical logs for current exercise
  useEffect(() => {
    const fetchHistory = async () => {
      const currentExercise = getCurrentExercise()
      if (!currentExercise || !session) return

      const exerciseId = currentExercise.exercise_id
      if (exerciseHistory.has(exerciseId)) return // Already loaded

      try {
        // Fetch recent logs for this exercise from other sessions
        const res = await fetch(`/api/set-logs?exercise_id=${exerciseId}&limit=10`)
        if (res.ok) {
          const data = await res.json()
          setExerciseHistory((prev) => {
            const newMap = new Map(prev)
            newMap.set(exerciseId, data)
            return newMap
          })
        }
      } catch {
        console.error('Failed to fetch exercise history')
      }
    }

    if (session) {
      fetchHistory()
    }
  }, [session, currentBlockIndex, currentExerciseIndex])

  // Timer effect
  useEffect(() => {
    if (isResting && !isPaused && restTimeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setRestTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsResting(false)
            // Vibrate if supported
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200])
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isResting, isPaused, restTimeRemaining])

  // Start session
  const startSession = async () => {
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ started_at: new Date().toISOString() }),
      })
    } catch {
      console.error('Failed to mark session as started')
    }
  }

  // Calculate session summary
  const calculateSummary = (): SessionSummary => {
    let totalSets = 0
    let totalReps = 0
    let totalVolume = 0
    let exercisesCompleted = 0
    let painFlags = 0

    completedSets.forEach((logs, exerciseId) => {
      if (logs.length > 0) {
        exercisesCompleted++
      }
      logs.forEach((log) => {
        totalSets++
        totalReps += log.repsCompleted
        if (log.weightUsed) {
          totalVolume += log.repsCompleted * log.weightUsed
        }
        if (log.painFlag) {
          painFlags++
        }
      })
    })

    const duration = sessionStartTime
      ? Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000)
      : 0

    return {
      duration,
      totalSets,
      totalReps,
      totalVolume,
      exercisesCompleted,
      painFlags,
    }
  }

  // Complete session
  const completeSession = async () => {
    // Calculate and show summary first
    const summary = calculateSummary()
    setSessionSummary(summary)
    setShowSummary(true)

    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_at: new Date().toISOString() }),
      })
    } catch {
      console.error('Failed to mark session as completed')
    }
  }

  // Get current exercise
  const getCurrentExercise = useCallback((): PlannedExercise | null => {
    if (!session?.session_blocks) return null
    const block = session.session_blocks[currentBlockIndex]
    if (!block?.planned_exercises) return null
    return block.planned_exercises[currentExerciseIndex] || null
  }, [session, currentBlockIndex, currentExerciseIndex])

  // Get current block
  const getCurrentBlock = useCallback((): SessionBlock | null => {
    if (!session?.session_blocks) return null
    return session.session_blocks[currentBlockIndex] || null
  }, [session, currentBlockIndex])

  // Log a set
  const handleLogSet = async () => {
    const currentExercise = getCurrentExercise()
    if (!currentExercise || !session) return

    const reps = parseInt(repsInput, 10)
    if (isNaN(reps) || reps < 0) {
      toast({
        variant: 'destructive',
        title: 'Ungültige Eingabe',
        description: 'Bitte gib die Anzahl der Wiederholungen ein',
      })
      return
    }

    const weight = weightInput ? parseFloat(weightInput) : null
    const exerciseLogs = completedSets.get(currentExercise.id) || []
    const setNumber = exerciseLogs.length + 1

    setIsLoggingSet(true)
    try {
      const result = await logSet({
        plannedExerciseId: currentExercise.id,
        athleteId: session.mesocycles.athlete_id,
        setNumber,
        repsCompleted: reps,
        weightUsed: weight,
        painFlag,
      })

      if (result.success) {
        const newLog: SetLog = {
          setNumber,
          repsCompleted: reps,
          weightUsed: weight,
          painFlag,
          clientUuid: result.clientUuid,
        }

        setCompletedSets((prev) => {
          const newMap = new Map(prev)
          const logs = [...(newMap.get(currentExercise.id) || []), newLog]
          newMap.set(currentExercise.id, logs)
          return newMap
        })

        // Reset inputs
        setRepsInput('')
        setPainFlag(false)
        // Keep weight for next set (common pattern)

        // Start rest timer if not last set
        if (setNumber < currentExercise.sets_target) {
          setRestTimeRemaining(currentExercise.rest_time_default)
          setIsResting(true)
          setIsPaused(false)
        }

        toast({
          title: `Satz ${setNumber} gespeichert`,
          description: `${reps} Wdh${weight ? ` @ ${weight}kg` : ''}${painFlag ? ' (Schmerz)' : ''}`,
        })
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Konnte Satz nicht speichern',
      })
    } finally {
      setIsLoggingSet(false)
    }
  }

  // Navigation
  const goToPreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex((prev) => prev - 1)
    } else if (currentBlockIndex > 0) {
      setCurrentBlockIndex((prev) => prev - 1)
      const prevBlock = session?.session_blocks[currentBlockIndex - 1]
      setCurrentExerciseIndex((prevBlock?.planned_exercises.length || 1) - 1)
    }
    setIsResting(false)
  }

  const goToNextExercise = () => {
    const block = getCurrentBlock()
    if (!block || !session) return

    if (currentExerciseIndex < block.planned_exercises.length - 1) {
      setCurrentExerciseIndex((prev) => prev + 1)
    } else if (currentBlockIndex < session.session_blocks.length - 1) {
      setCurrentBlockIndex((prev) => prev + 1)
      setCurrentExerciseIndex(0)
    }
    setIsResting(false)
  }

  // Timer controls
  const togglePause = () => setIsPaused((prev) => !prev)
  const skipRest = () => {
    setIsResting(false)
    setRestTimeRemaining(0)
  }
  const addTime = (seconds: number) => {
    setRestTimeRemaining((prev) => Math.max(0, prev + seconds))
  }

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${mins}min`
    }
    return `${mins} Minuten`
  }

  // Calculate progress
  const calculateProgress = (): { current: number; total: number } => {
    if (!session?.session_blocks) return { current: 0, total: 0 }

    let total = 0
    let current = 0

    session.session_blocks.forEach((block) => {
      block.planned_exercises.forEach((ex) => {
        const targetSets = ex.sets_target
        total += targetSets

        const logs = completedSets.get(ex.id) || []
        current += Math.min(logs.length, targetSets)
      })
    })

    return { current, total }
  }

  if (isLoading) {
    return (
      <>
        <Header
          title="Training"
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

  if (!session) {
    return null
  }

  // Session Summary Screen
  if (showSummary && sessionSummary) {
    return (
      <>
        <Header title="Training abgeschlossen" />
        <div className="space-y-6 p-4">
          {/* Success Animation */}
          <div className="flex flex-col items-center py-8">
            <div className="mb-4 rounded-full bg-green-100 p-6">
              <Trophy className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Super gemacht!</h2>
            <p className="text-muted-foreground">
              {session.name || `Woche ${session.week_number}`} abgeschlossen
            </p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="flex flex-col items-center p-4">
                <Clock className="mb-2 h-6 w-6 text-primary" />
                <p className="text-2xl font-bold">{formatDuration(sessionSummary.duration)}</p>
                <p className="text-sm text-muted-foreground">Dauer</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center p-4">
                <CheckCircle2 className="mb-2 h-6 w-6 text-green-600" />
                <p className="text-2xl font-bold">{sessionSummary.totalSets}</p>
                <p className="text-sm text-muted-foreground">Sätze</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center p-4">
                <BarChart3 className="mb-2 h-6 w-6 text-blue-600" />
                <p className="text-2xl font-bold">{sessionSummary.totalReps}</p>
                <p className="text-sm text-muted-foreground">Wiederholungen</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center p-4">
                <Dumbbell className="mb-2 h-6 w-6 text-purple-600" />
                <p className="text-2xl font-bold">
                  {sessionSummary.totalVolume > 1000
                    ? `${(sessionSummary.totalVolume / 1000).toFixed(1)}t`
                    : `${sessionSummary.totalVolume.toFixed(0)}kg`}
                </p>
                <p className="text-sm text-muted-foreground">Volumen</p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Info */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Übungen</span>
                <span className="font-medium">{sessionSummary.exercisesCompleted}</span>
              </div>
              {sessionSummary.painFlags > 0 && (
                <div className="flex justify-between text-yellow-600">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Schmerz-Markierungen
                  </span>
                  <span className="font-medium">{sessionSummary.painFlags}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            <Button className="w-full" onClick={() => router.push('/dashboard')}>
              <Home className="mr-2 h-4 w-4" />
              Zum Dashboard
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push('/session')}>
              Nächste Session
            </Button>
          </div>
        </div>
      </>
    )
  }

  const currentExercise = getCurrentExercise()
  const currentBlock = getCurrentBlock()
  const exerciseLogs = currentExercise ? (completedSets.get(currentExercise.id) || []) : []
  const currentSetNumber = exerciseLogs.length + 1
  const progress = calculateProgress()
  const isLastExercise = currentBlockIndex === session.session_blocks.length - 1 &&
    currentExerciseIndex === (currentBlock?.planned_exercises.length || 1) - 1
  const allSetsComplete = currentExercise && exerciseLogs.length >= currentExercise.sets_target

  // Get history for current exercise
  const currentExerciseHistory = currentExercise
    ? exerciseHistory.get(currentExercise.exercise_id) || []
    : []

  return (
    <>
      <Header
        title={session.name || `Woche ${session.week_number}`}
        leftAction={
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        }
        rightAction={
          <div className="flex items-center gap-1">
            {currentExerciseHistory.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHistory(!showHistory)}
                className={showHistory ? 'bg-muted' : ''}
              >
                <History className="h-5 w-5" />
              </Button>
            )}
            {!isOnline && (
              <div className="flex items-center gap-1 text-yellow-600">
                <WifiOff className="h-4 w-4" />
                <span className="text-xs">Offline</span>
              </div>
            )}
          </div>
        }
      />

      <div className="space-y-4 p-4">
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Fortschritt</span>
            <span className="font-medium">{progress.current} / {progress.total} Sätze</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* History Panel */}
        {showHistory && currentExerciseHistory.length > 0 && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <History className="h-4 w-4" />
                  Letzte Logs
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                {currentExerciseHistory.slice(0, 5).map((log, idx) => (
                  <div key={log.id || idx} className="flex justify-between text-muted-foreground">
                    <span>
                      {log.reps_completed} Wdh
                      {log.weight_used ? ` @ ${log.weight_used}kg` : ''}
                    </span>
                    <span className="text-xs">
                      {new Date(log.logged_at).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rest Timer Overlay */}
        {isResting && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="py-6">
              <div className="flex flex-col items-center space-y-4">
                <Timer className="h-8 w-8 text-primary" />
                <div className="text-4xl font-bold tabular-nums">
                  {formatTime(restTimeRemaining)}
                </div>
                <p className="text-sm text-muted-foreground">Pause</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => addTime(-15)}>
                    -15s
                  </Button>
                  <Button variant="outline" size="icon" onClick={togglePause}>
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addTime(15)}>
                    +15s
                  </Button>
                  <Button variant="ghost" size="sm" onClick={skipRest}>
                    Überspringen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Exercise Card */}
        {currentExercise && currentBlock && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Block {currentBlockIndex + 1}/{session.session_blocks.length}</span>
                  <span>•</span>
                  <span>Übung {currentExerciseIndex + 1}/{currentBlock.planned_exercises.length}</span>
                </div>
                {currentBlock.block_type !== 'single' && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {currentBlock.block_type === 'superset' ? 'Supersatz' : 'Cluster'}
                  </span>
                )}
              </div>
              <CardTitle className="text-xl">{currentExercise.exercises.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Exercise Image */}
              {currentExercise.exercises.image_url && (
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentExercise.exercises.image_url}
                    alt={currentExercise.exercises.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {/* Prescription */}
              <div className="flex items-center justify-center gap-6 rounded-lg bg-muted p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{currentExercise.sets_target}</p>
                  <p className="text-xs text-muted-foreground">Sätze</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{currentExercise.reps_target}</p>
                  <p className="text-xs text-muted-foreground">Wdh</p>
                </div>
                {currentExercise.weight_prescribed && (
                  <div className="text-center">
                    <p className="text-2xl font-bold">{currentExercise.weight_prescribed}</p>
                    <p className="text-xs text-muted-foreground">kg</p>
                  </div>
                )}
                {currentExercise.rir !== null && (
                  <div className="text-center">
                    <p className="text-2xl font-bold">{currentExercise.rir}</p>
                    <p className="text-xs text-muted-foreground">RIR</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {currentExercise.notes && (
                <p className="text-sm text-muted-foreground">
                  {currentExercise.notes}
                </p>
              )}

              {/* Completed Sets */}
              {exerciseLogs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Abgeschlossene Sätze</p>
                  <div className="flex flex-wrap gap-2">
                    {exerciseLogs.map((log) => (
                      <div
                        key={log.clientUuid}
                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm ${
                          log.painFlag ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>
                          {log.repsCompleted}
                          {log.weightUsed ? `@${log.weightUsed}kg` : ''}
                        </span>
                        {log.painFlag && <AlertTriangle className="h-3 w-3" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Set Input */}
              {!allSetsComplete && !isResting && (
                <div className="space-y-4 rounded-lg border p-4">
                  <p className="font-medium">Satz {currentSetNumber} von {currentExercise.sets_target}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Wiederholungen</label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder={currentExercise.reps_target}
                        value={repsInput}
                        onChange={(e) => setRepsInput(e.target.value)}
                        className="text-lg h-12"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Gewicht (kg)</label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder={currentExercise.weight_prescribed?.toString() || '-'}
                        value={weightInput}
                        onChange={(e) => setWeightInput(e.target.value)}
                        className="text-lg h-12"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="painFlag"
                      checked={painFlag}
                      onCheckedChange={(checked) => setPainFlag(checked as boolean)}
                    />
                    <label
                      htmlFor="painFlag"
                      className="flex items-center gap-1 text-sm text-muted-foreground"
                    >
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      Schmerzen/Unwohlsein
                    </label>
                  </div>
                  <Button
                    className="w-full h-12 text-base"
                    onClick={handleLogSet}
                    disabled={isLoggingSet || !repsInput}
                  >
                    {isLoggingSet ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                    )}
                    Satz speichern
                  </Button>
                </div>
              )}

              {/* All sets complete for this exercise */}
              {allSetsComplete && !isResting && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-600" />
                  <p className="font-medium text-green-700">Alle Sätze abgeschlossen!</p>
                  {!isLastExercise && (
                    <Button className="mt-3" onClick={goToNextExercise}>
                      Nächste Übung
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goToPreviousExercise}
            disabled={currentBlockIndex === 0 && currentExerciseIndex === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Zurück
          </Button>

          {isLastExercise && allSetsComplete ? (
            <Button onClick={completeSession} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Training beenden
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={goToNextExercise}
              disabled={isLastExercise}
            >
              Weiter
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Session Notes */}
        {session.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Trainer-Notizen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{session.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FloatingCard } from '@/components/ui/FloatingCard'
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
  RotateCcw,
  WifiOff,
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

  // Complete session
  const completeSession = async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_at: new Date().toISOString() }),
      })

      if (res.ok) {
        toast({
          title: 'Training abgeschlossen!',
          description: 'Deine Session wurde erfolgreich gespeichert.',
        })
        router.push(`/session/${sessionId}/summary`)
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Konnte Session nicht abschließen',
      })
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

  // Calculate progress
  const calculateProgress = (): { current: number; total: number } => {
    if (!session?.session_blocks) return { current: 0, total: 0 }

    let total = 0
    let current = 0

    session.session_blocks.forEach((block, blockIdx) => {
      block.planned_exercises.forEach((ex, exIdx) => {
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

  const currentExercise = getCurrentExercise()
  const currentBlock = getCurrentBlock()
  const exerciseLogs = currentExercise ? (completedSets.get(currentExercise.id) || []) : []
  const currentSetNumber = exerciseLogs.length + 1
  const progress = calculateProgress()
  const isLastExercise = currentBlockIndex === session.session_blocks.length - 1 &&
    currentExerciseIndex === (currentBlock?.planned_exercises.length || 1) - 1
  const allSetsComplete = currentExercise && exerciseLogs.length >= currentExercise.sets_target

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
          !isOnline && (
            <div className="flex items-center gap-1 text-yellow-600">
              <WifiOff className="h-4 w-4" />
              <span className="text-xs">Offline</span>
            </div>
          )
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

        {/* Rest Timer Overlay */}
        {isResting && (
          <FloatingCard className="border-primary bg-primary/5 fixed bottom-24 left-4 right-4 z-40 shadow-2xl backdrop-blur-md">
            <CardContent className="py-6">
              <div className="flex flex-col items-center space-y-4">
                <Timer className="h-8 w-8 text-primary animate-pulse" />
                <div className="text-5xl font-bold tabular-nums tracking-wider text-primary">
                  {formatTime(restTimeRemaining)}
                </div>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Pause</p>
                <div className="grid grid-cols-4 gap-2 w-full">
                  <Button variant="outline" size="sm" onClick={() => addTime(-15)} className="h-12 text-lg font-bold">
                    -15
                  </Button>
                  <Button variant="outline" size="icon" onClick={togglePause} className="h-12 w-full">
                    {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addTime(15)} className="h-12 text-lg font-bold">
                    +15
                  </Button>
                  <Button variant="ghost" size="sm" onClick={skipRest} className="h-12 text-muted-foreground hover:text-foreground">
                    Skip
                  </Button>
                </div>
              </div>
            </CardContent>
          </FloatingCard>
        )}

        {/* Current Exercise Card */}
        {currentExercise && currentBlock && (
          <FloatingCard className="pb-4">
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
                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm ${log.painFlag ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
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
                        className="text-2xl h-16 text-center font-bold"
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
                        className="text-2xl h-16 text-center font-bold"
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
                    className="w-full h-14 text-lg font-bold shadow-lg"
                    size="lg"
                    onClick={handleLogSet}
                    disabled={isLoggingSet || !repsInput}
                  >
                    {isLoggingSet ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Satz speichern
                  </Button>
                </div>
              )}

              {/* All sets complete for this exercise */}
              {allSetsComplete && !isResting && (
                <div className="rounded-2xl border border-green-200 bg-green-50/50 p-6 text-center backdrop-blur-sm">
                  <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-600 animate-bounce" />
                  <p className="font-bold text-lg text-green-700">Alle Sätze abgeschlossen!</p>
                  {!isLastExercise && (
                    <Button className="mt-4 w-full h-14 text-lg shadow-lg" onClick={goToNextExercise}>
                      Nächste Übung
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </FloatingCard>
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
          <FloatingCard>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Trainer-Notizen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{session.notes}</p>
            </CardContent>
          </FloatingCard>
        )}
      </div>
    </>
  )
}

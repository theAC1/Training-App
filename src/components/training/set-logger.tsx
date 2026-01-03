'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, Minus, Check } from 'lucide-react'

interface SetLog {
  id: string
  set_number: number
  reps_completed: number
  weight_used: number | null
  pain_flag: boolean
}

interface PlannedExercise {
  id: string
  sets_target: number
  reps_target: string
  weight_prescribed: number | null
  rest_time_default: number
}

interface SetLoggerProps {
  plannedExercise: PlannedExercise
  completedSets: SetLog[]
  onSetLogged: (restTime: number) => void
}

export function SetLogger({
  plannedExercise,
  completedSets,
  onSetLogged,
}: SetLoggerProps) {
  const { toast } = useToast()
  const [isLogging, setIsLogging] = useState(false)

  // Parse reps target to get default value (e.g., "8-12" -> 10, "10" -> 10)
  const parseRepsTarget = (target: string): number => {
    if (target.includes('-')) {
      const [min, max] = target.split('-').map(Number)
      return Math.round((min + max) / 2)
    }
    return parseInt(target) || 10
  }

  const nextSetNumber = completedSets.length + 1
  const isComplete = nextSetNumber > plannedExercise.sets_target

  // Get last set values or defaults
  const lastSet = completedSets[completedSets.length - 1]
  const [reps, setReps] = useState(
    lastSet?.reps_completed || parseRepsTarget(plannedExercise.reps_target)
  )
  const [weight, setWeight] = useState<string>(
    lastSet?.weight_used?.toString() ||
      plannedExercise.weight_prescribed?.toString() ||
      ''
  )
  const [painFlag, setPainFlag] = useState(false)

  const handleLogSet = async () => {
    setIsLogging(true)
    try {
      const response = await fetch('/api/set-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planned_exercise_id: plannedExercise.id,
          set_number: nextSetNumber,
          reps_completed: reps,
          weight_used: weight ? parseFloat(weight) : null,
          pain_flag: painFlag,
          client_uuid: crypto.randomUUID(),
        }),
      })

      if (!response.ok) {
        throw new Error('Fehler beim Speichern')
      }

      toast({
        title: `Satz ${nextSetNumber} gespeichert`,
        description: `${reps} Wdh${weight ? ` @ ${weight}kg` : ''}`,
      })

      // Reset pain flag for next set
      setPainFlag(false)

      // Trigger rest timer
      onSetLogged(plannedExercise.rest_time_default)
    } catch {
      toast({
        title: 'Fehler',
        description: 'Satz konnte nicht gespeichert werden',
        variant: 'destructive',
      })
    } finally {
      setIsLogging(false)
    }
  }

  const adjustReps = (delta: number) => {
    setReps((prev) => Math.max(0, Math.min(200, prev + delta)))
  }

  const adjustWeight = (delta: number) => {
    setWeight((prev) => {
      const current = parseFloat(prev) || 0
      const newValue = Math.max(0, current + delta)
      return newValue.toString()
    })
  }

  if (isComplete) {
    return (
      <Card className="border-success/50">
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <Check className="mx-auto h-8 w-8 text-success mb-2" />
            <p className="font-medium">Alle Sätze abgeschlossen!</p>
            <p className="text-sm text-muted-foreground">
              {completedSets.length} von {plannedExercise.sets_target} Sätze
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Satz {nextSetNumber} von {plannedExercise.sets_target}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reps Input */}
        <div className="space-y-2">
          <Label>Wiederholungen</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => adjustReps(-1)}
              disabled={reps <= 0}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              className="text-center text-2xl font-bold h-14"
              value={reps}
              onChange={(e) => setReps(parseInt(e.target.value) || 0)}
              min={0}
              max={200}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => adjustReps(1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Ziel: {plannedExercise.reps_target}
          </p>
        </div>

        {/* Weight Input */}
        <div className="space-y-2">
          <Label>Gewicht (kg)</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => adjustWeight(-2.5)}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              className="text-center text-xl h-12"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              step="0.5"
              min={0}
              placeholder="Optional"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => adjustWeight(2.5)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {plannedExercise.weight_prescribed && (
            <p className="text-xs text-muted-foreground text-center">
              Vorgabe: {plannedExercise.weight_prescribed}kg
            </p>
          )}
        </div>

        {/* Pain Flag */}
        <div className="flex items-center space-x-3 rounded-lg border p-3">
          <Checkbox
            id="pain-flag"
            checked={painFlag}
            onCheckedChange={(checked) => setPainFlag(checked === true)}
          />
          <div className="flex-1">
            <Label htmlFor="pain-flag" className="cursor-pointer">
              Schmerzen
            </Label>
            <p className="text-xs text-muted-foreground">
              Melde Schmerzen während der Übung
            </p>
          </div>
        </div>

        {/* Log Button */}
        <Button
          className="w-full h-14 text-lg"
          onClick={handleLogSet}
          disabled={isLogging || reps === 0}
        >
          {isLogging ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Check className="mr-2 h-5 w-5" />
          )}
          Satz speichern
        </Button>
      </CardContent>
    </Card>
  )
}

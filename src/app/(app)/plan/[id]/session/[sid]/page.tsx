'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  dayOfWeekLabels,
  blockTypeLabels,
} from '@/lib/validations/plan'
import {
  ArrowLeft,
  Plus,
  Loader2,
  Trash2,
  Save,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import Link from 'next/link'

interface Exercise {
  id: string
  name: string
  image_url: string
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
}

interface SessionBlock {
  id: string
  block_type: 'single' | 'superset' | 'cluster'
  order_index: number
  rest_between_rounds: number | null
  notes: string | null
  planned_exercises: PlannedExercise[]
}

interface Mesocycle {
  id: string
  name: string
}

interface Session {
  id: string
  mesocycle_id: string
  week_number: number
  day_of_week: number | null
  name: string | null
  order_index: number
  notes: string | null
  mesocycles: Mesocycle
  session_blocks: SessionBlock[]
}

export default function SessionEditorPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [session, setSession] = useState<Session | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Form state for session details
  const [sessionName, setSessionName] = useState('')
  const [sessionDayOfWeek, setSessionDayOfWeek] = useState<string>('')
  const [sessionNotes, setSessionNotes] = useState('')

  // New block form state
  const [showNewBlockForm, setShowNewBlockForm] = useState(false)
  const [newBlockType, setNewBlockType] = useState<string>('single')
  const [newBlockRest, setNewBlockRest] = useState('')
  const [isCreatingBlock, setIsCreatingBlock] = useState(false)

  // Expanded blocks state
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set())

  // New exercise form state
  const [addingExerciseToBlock, setAddingExerciseToBlock] = useState<string | null>(null)
  const [newExerciseId, setNewExerciseId] = useState('')
  const [newExerciseSets, setNewExerciseSets] = useState('3')
  const [newExerciseReps, setNewExerciseReps] = useState('8-12')
  const [newExerciseWeight, setNewExerciseWeight] = useState('')
  const [newExerciseRir, setNewExerciseRir] = useState('')
  const [newExerciseRest, setNewExerciseRest] = useState('120')
  const [newExerciseNotes, setNewExerciseNotes] = useState('')
  // Cluster-specific
  const [newExerciseClusterReps, setNewExerciseClusterReps] = useState('')
  const [newExerciseClusterCount, setNewExerciseClusterCount] = useState('')
  const [newExerciseIntraClusterRest, setNewExerciseIntraClusterRest] = useState('')
  const [isAddingExercise, setIsAddingExercise] = useState(false)

  const loadSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${params.sid}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push(`/plan/${params.id}`)
          return
        }
        throw new Error('Fehler beim Laden')
      }
      const data = await response.json()
      setSession(data)
      setSessionName(data.name || '')
      setSessionDayOfWeek(data.day_of_week?.toString() || '')
      setSessionNotes(data.notes || '')
      // Expand all blocks by default
      setExpandedBlocks(new Set(data.session_blocks?.map((b: SessionBlock) => b.id) || []))
    } catch {
      toast({
        title: 'Fehler',
        description: 'Session konnte nicht geladen werden',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [params.id, params.sid, router, toast])

  const loadExercises = useCallback(async () => {
    try {
      const response = await fetch('/api/exercises')
      if (!response.ok) throw new Error('Fehler beim Laden')
      const data = await response.json()
      setExercises(data)
    } catch {
      console.error('Fehler beim Laden der Übungen')
    }
  }, [])

  useEffect(() => {
    loadSession()
    loadExercises()
  }, [loadSession, loadExercises])

  const handleSaveSession = async () => {
    if (!session) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sessionName || null,
          day_of_week: sessionDayOfWeek ? parseInt(sessionDayOfWeek) : null,
          notes: sessionNotes || null,
        }),
      })

      if (!response.ok) throw new Error('Fehler beim Speichern')

      toast({
        title: 'Erfolg',
        description: 'Session wurde gespeichert',
      })
    } catch {
      toast({
        title: 'Fehler',
        description: 'Session konnte nicht gespeichert werden',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateBlock = async () => {
    if (!session) return

    setIsCreatingBlock(true)
    try {
      const blocks = session.session_blocks || []
      const response = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          block_type: newBlockType,
          order_index: blocks.length,
          rest_between_rounds: newBlockRest ? parseInt(newBlockRest) : null,
        }),
      })

      if (!response.ok) throw new Error('Fehler beim Erstellen')

      toast({
        title: 'Erfolg',
        description: 'Block wurde erstellt',
      })

      setShowNewBlockForm(false)
      setNewBlockType('single')
      setNewBlockRest('')
      loadSession()
    } catch {
      toast({
        title: 'Fehler',
        description: 'Block konnte nicht erstellt werden',
        variant: 'destructive',
      })
    } finally {
      setIsCreatingBlock(false)
    }
  }

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Block wirklich löschen?')) return

    try {
      const response = await fetch(`/api/blocks/${blockId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Fehler beim Löschen')

      toast({
        title: 'Erfolg',
        description: 'Block wurde gelöscht',
      })

      loadSession()
    } catch {
      toast({
        title: 'Fehler',
        description: 'Block konnte nicht gelöscht werden',
        variant: 'destructive',
      })
    }
  }

  const handleAddExercise = async (blockId: string, blockType: string) => {
    if (!newExerciseId) {
      toast({
        title: 'Fehler',
        description: 'Bitte wähle eine Übung aus',
        variant: 'destructive',
      })
      return
    }

    setIsAddingExercise(true)
    try {
      const block = session?.session_blocks?.find((b) => b.id === blockId)
      const existingExercises = block?.planned_exercises || []

      const payload: Record<string, unknown> = {
        block_id: blockId,
        exercise_id: newExerciseId,
        order_in_block: existingExercises.length,
        sets_target: parseInt(newExerciseSets) || 3,
        reps_target: newExerciseReps || '8-12',
        weight_prescribed: newExerciseWeight ? parseFloat(newExerciseWeight) : null,
        rir: newExerciseRir ? parseInt(newExerciseRir) : null,
        rest_time_default: parseInt(newExerciseRest) || 120,
        notes: newExerciseNotes || null,
      }

      // Add cluster fields if block type is cluster
      if (blockType === 'cluster') {
        payload.cluster_reps = newExerciseClusterReps
          ? parseInt(newExerciseClusterReps)
          : null
        payload.cluster_count = newExerciseClusterCount
          ? parseInt(newExerciseClusterCount)
          : null
        payload.intra_cluster_rest = newExerciseIntraClusterRest
          ? parseInt(newExerciseIntraClusterRest)
          : null
      }

      const response = await fetch('/api/planned-exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Fehler beim Hinzufügen')

      toast({
        title: 'Erfolg',
        description: 'Übung wurde hinzugefügt',
      })

      // Reset form
      setAddingExerciseToBlock(null)
      setNewExerciseId('')
      setNewExerciseSets('3')
      setNewExerciseReps('8-12')
      setNewExerciseWeight('')
      setNewExerciseRir('')
      setNewExerciseRest('120')
      setNewExerciseNotes('')
      setNewExerciseClusterReps('')
      setNewExerciseClusterCount('')
      setNewExerciseIntraClusterRest('')

      loadSession()
    } catch {
      toast({
        title: 'Fehler',
        description: 'Übung konnte nicht hinzugefügt werden',
        variant: 'destructive',
      })
    } finally {
      setIsAddingExercise(false)
    }
  }

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!confirm('Übung wirklich entfernen?')) return

    try {
      const response = await fetch(`/api/planned-exercises/${exerciseId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Fehler beim Löschen')

      toast({
        title: 'Erfolg',
        description: 'Übung wurde entfernt',
      })

      loadSession()
    } catch {
      toast({
        title: 'Fehler',
        description: 'Übung konnte nicht entfernt werden',
        variant: 'destructive',
      })
    }
  }

  const toggleBlockExpanded = (blockId: string) => {
    const newExpanded = new Set(expandedBlocks)
    if (newExpanded.has(blockId)) {
      newExpanded.delete(blockId)
    } else {
      newExpanded.add(blockId)
    }
    setExpandedBlocks(newExpanded)
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

  const sortedBlocks = [...(session.session_blocks || [])].sort(
    (a, b) => a.order_index - b.order_index
  )

  return (
    <>
      <Header
        title="Session bearbeiten"
        leftAction={
          <Button asChild size="icon" variant="ghost">
            <Link href={`/plan/${params.id}`}>
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Zurück</span>
            </Link>
          </Button>
        }
        rightAction={
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSaveSession}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            <span className="sr-only">Speichern</span>
          </Button>
        }
      />
      <div className="p-4 space-y-4 pb-24">
        {/* Session Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Session Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-name">Name</Label>
              <Input
                id="session-name"
                placeholder="z.B. Push Day"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-day">Wochentag</Label>
              <Select
                value={sessionDayOfWeek || 'none'}
                onValueChange={(val) => setSessionDayOfWeek(val === 'none' ? '' : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tag auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Tag</SelectItem>
                  {Object.entries(dayOfWeekLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-notes">Notizen</Label>
              <Textarea
                id="session-notes"
                placeholder="Hinweise zur Session..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Blocks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Blöcke</h2>
            <span className="text-sm text-muted-foreground">
              {sortedBlocks.length} {sortedBlocks.length === 1 ? 'Block' : 'Blöcke'}
            </span>
          </div>

          {sortedBlocks.map((block, index) => (
            <Card key={block.id}>
              <CardContent className="p-0">
                {/* Block Header */}
                <div
                  className="flex items-center gap-2 p-4 cursor-pointer"
                  onClick={() => toggleBlockExpanded(block.id)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Block {index + 1}</span>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs">
                        {blockTypeLabels[block.block_type]}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {block.planned_exercises?.length || 0} Übungen
                      {block.rest_between_rounds &&
                        ` • ${block.rest_between_rounds}s Pause`}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteBlock(block.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                  {expandedBlocks.has(block.id) ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {/* Block Content (Expanded) */}
                {expandedBlocks.has(block.id) && (
                  <div className="border-t px-4 pb-4 pt-2 space-y-3">
                    {/* Exercises in block */}
                    {block.planned_exercises
                      ?.sort((a, b) => a.order_in_block - b.order_in_block)
                      .map((pe) => (
                        <div
                          key={pe.id}
                          className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{pe.exercises?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {pe.sets_target} x {pe.reps_target}
                              {pe.weight_prescribed && ` @ ${pe.weight_prescribed}kg`}
                              {pe.rir !== null && ` • RIR ${pe.rir}`}
                              {pe.rest_time_default && ` • ${pe.rest_time_default}s`}
                            </p>
                            {block.block_type === 'cluster' &&
                              pe.cluster_reps &&
                              pe.cluster_count && (
                                <p className="text-sm text-muted-foreground">
                                  Cluster: {pe.cluster_reps} reps x {pe.cluster_count}
                                  {pe.intra_cluster_rest &&
                                    ` (${pe.intra_cluster_rest}s)`}
                                </p>
                              )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteExercise(pe.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}

                    {/* Add Exercise Form */}
                    {addingExerciseToBlock === block.id ? (
                      <div className="space-y-3 rounded-lg border p-3">
                        <div className="space-y-2">
                          <Label>Übung *</Label>
                          <Select
                            value={newExerciseId}
                            onValueChange={setNewExerciseId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Übung auswählen" />
                            </SelectTrigger>
                            <SelectContent>
                              {exercises.map((ex) => (
                                <SelectItem key={ex.id} value={ex.id}>
                                  {ex.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Sätze</Label>
                            <Input
                              type="number"
                              min={1}
                              max={20}
                              value={newExerciseSets}
                              onChange={(e) => setNewExerciseSets(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Wiederholungen</Label>
                            <Input
                              placeholder="z.B. 8-12"
                              value={newExerciseReps}
                              onChange={(e) => setNewExerciseReps(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>Gewicht (kg)</Label>
                            <Input
                              type="number"
                              step="0.5"
                              placeholder="Optional"
                              value={newExerciseWeight}
                              onChange={(e) => setNewExerciseWeight(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>RIR</Label>
                            <Input
                              type="number"
                              min={0}
                              max={10}
                              placeholder="0-10"
                              value={newExerciseRir}
                              onChange={(e) => setNewExerciseRir(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Pause (s)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={newExerciseRest}
                              onChange={(e) => setNewExerciseRest(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Cluster-specific fields */}
                        {block.block_type === 'cluster' && (
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-2">
                              <Label>Cluster Reps</Label>
                              <Input
                                type="number"
                                min={1}
                                max={10}
                                value={newExerciseClusterReps}
                                onChange={(e) =>
                                  setNewExerciseClusterReps(e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Cluster Count</Label>
                              <Input
                                type="number"
                                min={1}
                                max={10}
                                value={newExerciseClusterCount}
                                onChange={(e) =>
                                  setNewExerciseClusterCount(e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Intra Rest (s)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={newExerciseIntraClusterRest}
                                onChange={(e) =>
                                  setNewExerciseIntraClusterRest(e.target.value)
                                }
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Notizen</Label>
                          <Textarea
                            placeholder="Optional"
                            value={newExerciseNotes}
                            onChange={(e) => setNewExerciseNotes(e.target.value)}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setAddingExerciseToBlock(null)
                              setNewExerciseId('')
                            }}
                          >
                            Abbrechen
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={() =>
                              handleAddExercise(block.id, block.block_type)
                            }
                            disabled={isAddingExercise}
                          >
                            {isAddingExercise && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Hinzufügen
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setAddingExerciseToBlock(block.id)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Übung hinzufügen
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* New Block Form */}
          {showNewBlockForm ? (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Block-Typ</Label>
                  <Select value={newBlockType} onValueChange={setNewBlockType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">
                        {blockTypeLabels.single}
                      </SelectItem>
                      <SelectItem value="superset">
                        {blockTypeLabels.superset}
                      </SelectItem>
                      <SelectItem value="cluster">
                        {blockTypeLabels.cluster}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pause zwischen Runden (Sekunden)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="z.B. 180"
                    value={newBlockRest}
                    onChange={(e) => setNewBlockRest(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowNewBlockForm(false)
                      setNewBlockType('single')
                      setNewBlockRest('')
                    }}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCreateBlock}
                    disabled={isCreatingBlock}
                  >
                    {isCreatingBlock && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Erstellen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowNewBlockForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Block hinzufügen
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

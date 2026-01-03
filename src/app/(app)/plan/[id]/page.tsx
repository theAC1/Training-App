'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { dayOfWeekLabels, statusLabels } from '@/lib/validations/plan'
import {
  ArrowLeft,
  Plus,
  Loader2,
  MoreVertical,
  Trash2,
  Edit,
  Dumbbell,
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
  exercises: Exercise
}

interface SessionBlock {
  id: string
  block_type: 'single' | 'superset' | 'cluster'
  order_index: number
  rest_between_rounds: number | null
  planned_exercises: PlannedExercise[]
}

interface Session {
  id: string
  week_number: number
  day_of_week: number | null
  name: string | null
  order_index: number
  notes: string | null
  session_blocks: SessionBlock[]
}

interface Profile {
  id: string
  name: string
}

interface Mesocycle {
  id: string
  name: string
  phase: string | null
  duration_weeks: number
  status: 'draft' | 'active' | 'completed'
  start_date: string | null
  profiles: Profile
  sessions: Session[]
}

export default function MesocycleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [mesocycle, setMesocycle] = useState<Mesocycle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeWeek, setActiveWeek] = useState('1')
  const [showNewSessionForm, setShowNewSessionForm] = useState(false)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')
  const [newSessionDayOfWeek, setNewSessionDayOfWeek] = useState<string>('')
  const [showEditMenu, setShowEditMenu] = useState<string | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const loadMesocycle = useCallback(async () => {
    try {
      const response = await fetch(`/api/mesocycles/${params.id}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/plan')
          return
        }
        throw new Error('Fehler beim Laden')
      }
      const data = await response.json()
      setMesocycle(data)
    } catch {
      toast({
        title: 'Fehler',
        description: 'Mesozyklus konnte nicht geladen werden',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [params.id, router, toast])

  useEffect(() => {
    loadMesocycle()
  }, [loadMesocycle])

  const handleCreateSession = async () => {
    if (!mesocycle) return

    setIsCreatingSession(true)
    try {
      const weekNumber = parseInt(activeWeek)
      const sessionsInWeek = mesocycle.sessions.filter(
        (s) => s.week_number === weekNumber
      )

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mesocycle_id: mesocycle.id,
          week_number: weekNumber,
          day_of_week: newSessionDayOfWeek ? parseInt(newSessionDayOfWeek) : null,
          name: newSessionName || null,
          order_index: sessionsInWeek.length,
        }),
      })

      if (!response.ok) throw new Error('Fehler beim Erstellen')

      const newSession = await response.json()

      toast({
        title: 'Erfolg',
        description: 'Session wurde erstellt',
      })

      setShowNewSessionForm(false)
      setNewSessionName('')
      setNewSessionDayOfWeek('')

      // Navigate to the new session
      router.push(`/plan/${mesocycle.id}/session/${newSession.id}`)
    } catch {
      toast({
        title: 'Fehler',
        description: 'Session konnte nicht erstellt werden',
        variant: 'destructive',
      })
    } finally {
      setIsCreatingSession(false)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Session wirklich löschen?')) return

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Fehler beim Löschen')

      toast({
        title: 'Erfolg',
        description: 'Session wurde gelöscht',
      })

      loadMesocycle()
    } catch {
      toast({
        title: 'Fehler',
        description: 'Session konnte nicht gelöscht werden',
        variant: 'destructive',
      })
    }
    setShowEditMenu(null)
  }

  const handleDeleteMesocycle = async () => {
    if (!mesocycle) return
    if (!confirm('Mesozyklus wirklich löschen? Alle Sessions werden auch gelöscht.'))
      return

    try {
      const response = await fetch(`/api/mesocycles/${mesocycle.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Fehler beim Löschen')

      toast({
        title: 'Erfolg',
        description: 'Mesozyklus wurde gelöscht',
      })

      router.push('/plan')
    } catch {
      toast({
        title: 'Fehler',
        description: 'Mesozyklus konnte nicht gelöscht werden',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!mesocycle) return

    setIsUpdatingStatus(true)
    try {
      const response = await fetch(`/api/mesocycles/${mesocycle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Fehler beim Aktualisieren')

      setMesocycle({ ...mesocycle, status: newStatus as Mesocycle['status'] })

      toast({
        title: 'Erfolg',
        description: 'Status wurde aktualisiert',
      })
    } catch {
      toast({
        title: 'Fehler',
        description: 'Status konnte nicht aktualisiert werden',
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingStatus(false)
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

  if (!mesocycle) {
    return null
  }

  const weeks = Array.from({ length: mesocycle.duration_weeks }, (_, i) => i + 1)
  const weekSessions = mesocycle.sessions
    .filter((s) => s.week_number === parseInt(activeWeek))
    .sort((a, b) => a.order_index - b.order_index)

  return (
    <>
      <Header
        title={mesocycle.name}
        leftAction={
          <Button asChild size="icon" variant="ghost">
            <Link href="/plan">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Zurück</span>
            </Link>
          </Button>
        }
        rightAction={
          <Button size="icon" variant="ghost" onClick={handleDeleteMesocycle}>
            <Trash2 className="h-5 w-5" />
            <span className="sr-only">Löschen</span>
          </Button>
        }
      />
      <div className="p-4 space-y-4">
        {/* Mesocycle Info Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {mesocycle.profiles?.name || 'Kein Athlet'} •{' '}
                  {mesocycle.duration_weeks} Wochen
                  {mesocycle.phase && ` • ${mesocycle.phase}`}
                </p>
              </div>
              <Select
                value={mesocycle.status}
                onValueChange={handleUpdateStatus}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{statusLabels.draft}</SelectItem>
                  <SelectItem value="active">{statusLabels.active}</SelectItem>
                  <SelectItem value="completed">{statusLabels.completed}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Week Tabs */}
        <Tabs value={activeWeek} onValueChange={setActiveWeek}>
          <TabsList className="w-full">
            {weeks.map((week) => (
              <TabsTrigger key={week} value={String(week)} className="flex-1">
                W{week}
              </TabsTrigger>
            ))}
          </TabsList>

          {weeks.map((week) => (
            <TabsContent key={week} value={String(week)} className="mt-4">
              <div className="space-y-3">
                {weekSessions.length === 0 && !showNewSessionForm && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <Dumbbell className="mb-4 h-10 w-10 text-muted-foreground" />
                      <p className="text-center text-muted-foreground">
                        Keine Sessions in Woche {week}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {weekSessions.map((session) => (
                  <Card key={session.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/plan/${mesocycle.id}/session/${session.id}`}
                          className="flex-1"
                        >
                          <h3 className="font-medium">
                            {session.name || 'Unbenannte Session'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {session.day_of_week !== null
                              ? dayOfWeekLabels[session.day_of_week]
                              : 'Kein Tag zugewiesen'}{' '}
                            • {session.session_blocks?.length || 0} Blöcke
                          </p>
                        </Link>
                        <div className="relative">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              setShowEditMenu(
                                showEditMenu === session.id ? null : session.id
                              )
                            }
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          {showEditMenu === session.id && (
                            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border bg-popover p-1 shadow-lg">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                asChild
                              >
                                <Link
                                  href={`/plan/${mesocycle.id}/session/${session.id}`}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Bearbeiten
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-destructive hover:text-destructive"
                                onClick={() => handleDeleteSession(session.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Löschen
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {showNewSessionForm && (
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="session-name">Name (optional)</Label>
                        <Input
                          id="session-name"
                          placeholder="z.B. Push Day"
                          value={newSessionName}
                          onChange={(e) => setNewSessionName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="session-day">Wochentag (optional)</Label>
                        <Select
                          value={newSessionDayOfWeek}
                          onValueChange={setNewSessionDayOfWeek}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tag auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(dayOfWeekLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setShowNewSessionForm(false)
                            setNewSessionName('')
                            setNewSessionDayOfWeek('')
                          }}
                        >
                          Abbrechen
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={handleCreateSession}
                          disabled={isCreatingSession}
                        >
                          {isCreatingSession && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Erstellen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!showNewSessionForm && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowNewSessionForm(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Session hinzufügen
                  </Button>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  )
}

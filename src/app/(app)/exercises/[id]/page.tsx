'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Dumbbell,
  Pencil,
  Trash2,
  Loader2,
  ChevronRight,
  Save,
  X,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

interface RelatedExercise {
  id: string
  name: string
  image_url: string | null
}

interface Exercise {
  id: string
  name: string
  grundform: string | null
  image_url: string
  video_url: string | null
  categories: string[]
  muscle_groups: string[]
  equipment: string[]
  description: string | null
  purpose_note: string | null
  related_exercises?: RelatedExercise[]
}

interface Grundform {
  name: string
  count: number
}

export default function ExerciseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const exerciseId = params.id as string

  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [grundformen, setGrundformen] = useState<Grundform[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTrainer, setIsTrainer] = useState(false)

  // Edit form state
  const [editData, setEditData] = useState({
    name: '',
    grundform: '',
    newGrundform: '',
    muscleGroups: '',
    equipment: '',
    imageUrl: '',
    videoUrl: '',
    description: '',
  })

  // Fetch exercise and grundformen
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [exerciseRes, grundformenRes, roleRes] = await Promise.all([
          fetch(`/api/exercises/${exerciseId}`),
          fetch('/api/exercises/grundformen'),
          fetch('/api/athletes'),
        ])

        if (exerciseRes.ok) {
          const data = await exerciseRes.json()
          setExercise(data)
          setEditData({
            name: data.name,
            grundform: data.grundform || '',
            newGrundform: '',
            muscleGroups: data.muscle_groups?.join(', ') || '',
            equipment: data.equipment?.join(', ') || '',
            imageUrl: data.image_url || '',
            videoUrl: data.video_url || '',
            description: data.description || '',
          })
        } else {
          toast({
            variant: 'destructive',
            title: 'Fehler',
            description: 'Übung nicht gefunden',
          })
          router.push('/exercises')
        }

        if (grundformenRes.ok) {
          setGrundformen(await grundformenRes.json())
        }

        setIsTrainer(roleRes.ok)
      } catch {
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description: 'Konnte Übung nicht laden',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [exerciseId, router, toast])

  // Save changes
  const handleSave = async () => {
    if (!editData.name.trim()) return

    // Use new grundform if provided, otherwise selected one
    const finalGrundform = editData.newGrundform.trim() || editData.grundform || null

    setIsSaving(true)
    try {
      const res = await fetch(`/api/exercises/${exerciseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editData.name.trim(),
          grundform: finalGrundform,
          image_url: editData.imageUrl.trim() || '',
          video_url: editData.videoUrl.trim() || null,
          description: editData.description.trim() || null,
          muscle_groups: editData.muscleGroups
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          equipment: editData.equipment
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      })

      if (res.ok) {
        const updated = await res.json()
        setExercise((prev) =>
          prev
            ? {
                ...prev,
                ...updated,
              }
            : null
        )
        setIsEditing(false)
        toast({
          title: 'Gespeichert',
          description: 'Änderungen wurden übernommen',
        })
      } else {
        const error = await res.json()
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description: error.error || 'Konnte nicht speichern',
        })
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Ein Fehler ist aufgetreten',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Cancel editing
  const handleCancel = () => {
    if (exercise) {
      setEditData({
        name: exercise.name,
        grundform: exercise.grundform || '',
        newGrundform: '',
        muscleGroups: exercise.muscle_groups?.join(', ') || '',
        equipment: exercise.equipment?.join(', ') || '',
        imageUrl: exercise.image_url || '',
        videoUrl: exercise.video_url || '',
        description: exercise.description || '',
      })
    }
    setIsEditing(false)
  }

  // Delete exercise
  const handleDelete = async () => {
    if (!confirm(`Möchtest du "${exercise?.name}" wirklich löschen?`)) return

    try {
      const res = await fetch(`/api/exercises/${exerciseId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast({
          title: 'Gelöscht',
          description: 'Übung wurde entfernt',
        })
        router.push('/exercises')
      } else {
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description: 'Konnte nicht löschen',
        })
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Ein Fehler ist aufgetreten',
      })
    }
  }

  if (isLoading) {
    return (
      <>
        <Header
          title="Übung"
          leftAction={
            <Button variant="ghost" size="icon" asChild>
              <Link href="/exercises">
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

  if (!exercise) {
    return null
  }

  return (
    <>
      <Header
        title="Übung"
        leftAction={
          <Button variant="ghost" size="icon" asChild>
            <Link href="/exercises">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        }
        rightAction={
          isTrainer && !isEditing && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                <Pencil className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          )
        }
      />
      <div className="space-y-6 p-4">
        {/* Exercise Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">{exercise.name}</CardTitle>
            {exercise.grundform && (
              <p className="text-sm text-muted-foreground">
                Grundform: {exercise.grundform}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Image */}
            {exercise.image_url && (
              <div className="overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={exercise.image_url}
                  alt={exercise.name}
                  className="w-full object-cover max-h-64"
                />
              </div>
            )}

            {/* Muscle Groups */}
            {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Muskelgruppen</h4>
                <div className="flex flex-wrap gap-2">
                  {exercise.muscle_groups.map((mg) => (
                    <span
                      key={mg}
                      className="rounded-full bg-primary/10 px-3 py-1 text-sm"
                    >
                      {mg}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Equipment */}
            {exercise.equipment && exercise.equipment.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Equipment</h4>
                <div className="flex flex-wrap gap-2">
                  {exercise.equipment.map((eq) => (
                    <span
                      key={eq}
                      className="rounded-full bg-muted px-3 py-1 text-sm"
                    >
                      {eq}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {exercise.description && (
              <div>
                <h4 className="text-sm font-medium mb-2">Beschreibung</h4>
                <p className="text-sm text-muted-foreground">{exercise.description}</p>
              </div>
            )}

            {/* Video Link */}
            {exercise.video_url && (
              <a
                href={exercise.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Video ansehen
              </a>
            )}
          </CardContent>
        </Card>

        {/* Edit Form */}
        {isEditing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Übung bearbeiten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Name *</Label>
                <Input
                  id="editName"
                  value={editData.name}
                  onChange={(e) =>
                    setEditData((d) => ({ ...d, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editGrundform">Grundform</Label>
                <Select
                  value={editData.grundform || 'none'}
                  onValueChange={(val) => {
                    setEditData((d) => ({
                      ...d,
                      grundform: val === 'none' ? '' : val,
                      newGrundform: val === 'new' ? d.newGrundform : '',
                    }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Grundform auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keine Grundform</SelectItem>
                    <SelectItem value="new">+ Neue Grundform erstellen</SelectItem>
                    {grundformen.map((gf) => (
                      <SelectItem key={gf.name} value={gf.name}>
                        {gf.name} ({gf.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editData.grundform === 'new' && (
                  <Input
                    value={editData.newGrundform}
                    onChange={(e) =>
                      setEditData((d) => ({ ...d, newGrundform: e.target.value }))
                    }
                    placeholder="Name der neuen Grundform"
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="editMuscles">Muskelgruppen</Label>
                <Input
                  id="editMuscles"
                  value={editData.muscleGroups}
                  onChange={(e) =>
                    setEditData((d) => ({ ...d, muscleGroups: e.target.value }))
                  }
                  placeholder="Komma-getrennt"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editEquipment">Equipment</Label>
                <Input
                  id="editEquipment"
                  value={editData.equipment}
                  onChange={(e) =>
                    setEditData((d) => ({ ...d, equipment: e.target.value }))
                  }
                  placeholder="Komma-getrennt"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editImage">Bild URL</Label>
                <Input
                  id="editImage"
                  value={editData.imageUrl}
                  onChange={(e) =>
                    setEditData((d) => ({ ...d, imageUrl: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editVideo">Video URL</Label>
                <Input
                  id="editVideo"
                  value={editData.videoUrl}
                  onChange={(e) =>
                    setEditData((d) => ({ ...d, videoUrl: e.target.value }))
                  }
                  placeholder="https://youtube.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDesc">Beschreibung</Label>
                <textarea
                  id="editDesc"
                  value={editData.description}
                  onChange={(e) =>
                    setEditData((d) => ({ ...d, description: e.target.value }))
                  }
                  placeholder="Kurze Beschreibung..."
                  className="w-full min-h-[80px] p-2 text-sm border rounded-lg"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={isSaving || !editData.name.trim()}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Speichern
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Abbrechen
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Related Exercises (same Grundform) */}
        {exercise.related_exercises && exercise.related_exercises.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">
              Weitere {exercise.grundform}-Übungen
            </h2>
            <div className="space-y-2">
              {exercise.related_exercises.map((related) => (
                <Link key={related.id} href={`/exercises/${related.id}`}>
                  <Card className="transition-colors hover:bg-accent">
                    <CardContent className="flex items-center gap-4 p-3">
                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                        {related.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={related.image_url}
                            alt={related.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Dumbbell className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{related.name}</h3>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

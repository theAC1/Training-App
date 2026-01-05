'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Dumbbell,
  Plus,
  Pencil,
  Check,
  X,
  Trash2,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'

interface Exercise {
  id: string
  name: string
  parent_exercise_id: string | null
  image_url: string
  video_url: string | null
  categories: string[]
  muscle_groups: string[]
  equipment: string[]
  description: string | null
  purpose_note: string | null
  variations?: Exercise[]
}

export default function ExerciseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const exerciseId = params.id as string

  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showAddVariation, setShowAddVariation] = useState(false)
  const [newVariation, setNewVariation] = useState({
    name: '',
    image_url: '',
    video_url: '',
    description: '',
  })
  const [isAddingVariation, setIsAddingVariation] = useState(false)

  // Fetch exercise
  useEffect(() => {
    const fetchExercise = async () => {
      try {
        const res = await fetch(`/api/exercises/${exerciseId}`)
        if (res.ok) {
          const data = await res.json()
          setExercise(data)
          setEditName(data.name)
        } else {
          toast({
            variant: 'destructive',
            title: 'Fehler',
            description: 'Übung nicht gefunden',
          })
          router.push('/exercises')
        }
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

    fetchExercise()
  }, [exerciseId, router, toast])

  // Save name edit
  const handleSaveName = async () => {
    if (!editName.trim() || editName === exercise?.name) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/exercises/${exerciseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })

      if (res.ok) {
        const updated = await res.json()
        setExercise((prev) => (prev ? { ...prev, name: updated.name } : null))
        setIsEditing(false)
        toast({
          title: 'Gespeichert',
          description: 'Name wurde aktualisiert',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description: 'Konnte nicht speichern',
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

  // Add variation
  const handleAddVariation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newVariation.name.trim()) return

    setIsAddingVariation(true)
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newVariation.name.trim(),
          parent_exercise_id: exerciseId,
          image_url: newVariation.image_url.trim() || '',
          video_url: newVariation.video_url.trim() || null,
          description: newVariation.description.trim() || null,
          categories: exercise?.categories || [],
          muscle_groups: exercise?.muscle_groups || [],
          equipment: exercise?.equipment || [],
        }),
      })

      if (res.ok) {
        const variation = await res.json()
        setExercise((prev) =>
          prev
            ? { ...prev, variations: [...(prev.variations || []), variation] }
            : null
        )
        setShowAddVariation(false)
        setNewVariation({ name: '', image_url: '', video_url: '', description: '' })
        toast({
          title: 'Variante erstellt',
          description: `${variation.name} wurde hinzugefügt`,
        })
      } else {
        const error = await res.json()
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description: error.error || 'Konnte Variante nicht erstellen',
        })
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Ein Fehler ist aufgetreten',
      })
    } finally {
      setIsAddingVariation(false)
    }
  }

  // Delete exercise
  const handleDelete = async () => {
    const variationCount = exercise?.variations?.length || 0
    const message = variationCount > 0
      ? `Möchtest du "${exercise?.name}" und alle ${variationCount} Varianten wirklich löschen?`
      : `Möchtest du "${exercise?.name}" wirklich löschen?`

    if (!confirm(message)) return

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

  const isMainExercise = !exercise.parent_exercise_id

  return (
    <>
      <Header
        title={isMainExercise ? 'Hauptübung' : 'Übungsvariante'}
        leftAction={
          <Button variant="ghost" size="icon" asChild>
            <Link href="/exercises">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        }
        rightAction={
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        }
      />
      <div className="space-y-6 p-4">
        {/* Main Exercise Info */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              {isEditing ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-lg font-semibold"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleSaveName}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setIsEditing(false)
                      setEditName(exercise.name)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <CardTitle className="text-xl">{exercise.name}</CardTitle>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {exercise.categories && exercise.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {exercise.categories.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full bg-muted px-3 py-1 text-sm"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
            {exercise.description && (
              <p className="mt-3 text-sm text-muted-foreground">
                {exercise.description}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Variations Section (only for main exercises) */}
        {isMainExercise && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Varianten ({exercise.variations?.length || 0})
              </h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddVariation(true)}
              >
                <Plus className="mr-1 h-4 w-4" />
                Variante
              </Button>
            </div>

            {/* Add Variation Form */}
            {showAddVariation && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Neue Variante</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowAddVariation(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddVariation} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="varName">Name *</Label>
                      <Input
                        id="varName"
                        value={newVariation.name}
                        onChange={(e) =>
                          setNewVariation((v) => ({ ...v, name: e.target.value }))
                        }
                        placeholder="z.B. Sumo Deadlift"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="varImage">Bild URL (optional)</Label>
                      <Input
                        id="varImage"
                        value={newVariation.image_url}
                        onChange={(e) =>
                          setNewVariation((v) => ({ ...v, image_url: e.target.value }))
                        }
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="varVideo">Video URL (optional)</Label>
                      <Input
                        id="varVideo"
                        value={newVariation.video_url}
                        onChange={(e) =>
                          setNewVariation((v) => ({ ...v, video_url: e.target.value }))
                        }
                        placeholder="https://youtube.com/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="varDesc">Beschreibung (optional)</Label>
                      <Input
                        id="varDesc"
                        value={newVariation.description}
                        onChange={(e) =>
                          setNewVariation((v) => ({ ...v, description: e.target.value }))
                        }
                        placeholder="Kurze Beschreibung..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={isAddingVariation}>
                        {isAddingVariation && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Erstellen
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddVariation(false)}
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Variations List */}
            {exercise.variations && exercise.variations.length > 0 ? (
              <div className="space-y-3">
                {exercise.variations.map((variation) => (
                  <Link
                    key={variation.id}
                    href={`/exercises/${variation.id}`}
                  >
                    <Card className="transition-colors hover:bg-accent">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                          {variation.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={variation.image_url}
                              alt={variation.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Dumbbell className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <h3 className="font-medium">{variation.name}</h3>
                          {variation.description && (
                            <p className="truncate text-sm text-muted-foreground">
                              {variation.description}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              !showAddVariation && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Dumbbell className="mb-3 h-8 w-8 text-muted-foreground" />
                    <p className="text-center text-sm text-muted-foreground">
                      Noch keine Varianten vorhanden
                    </p>
                    <Button
                      className="mt-3"
                      size="sm"
                      onClick={() => setShowAddVariation(true)}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Erste Variante erstellen
                    </Button>
                  </CardContent>
                </Card>
              )
            )}
          </>
        )}

        {/* For variations: show image and video */}
        {!isMainExercise && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Medien</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {exercise.image_url ? (
                <div className="overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={exercise.image_url}
                    alt={exercise.name}
                    className="w-full object-cover"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Kein Bild vorhanden</p>
              )}
              {exercise.video_url && (
                <a
                  href={exercise.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-primary hover:underline"
                >
                  Video ansehen →
                </a>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

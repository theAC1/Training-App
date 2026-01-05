'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { ArrowLeft, Loader2 } from 'lucide-react'

interface Grundform {
  name: string
  count: number
}

export default function NewExercisePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [grundformen, setGrundformen] = useState<Grundform[]>([])

  // Form fields
  const [name, setName] = useState('')
  const [grundform, setGrundform] = useState('')
  const [newGrundform, setNewGrundform] = useState('')
  const [muscleGroups, setMuscleGroups] = useState('')
  const [equipment, setEquipment] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [description, setDescription] = useState('')

  // Load existing grundformen for dropdown
  useEffect(() => {
    const loadGrundformen = async () => {
      try {
        const res = await fetch('/api/exercises/grundformen')
        if (res.ok) {
          const data = await res.json()
          setGrundformen(data)
        }
      } catch {
        console.error('Fehler beim Laden der Grundformen')
      }
    }
    loadGrundformen()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    // Use new grundform if provided, otherwise selected one
    const finalGrundform = newGrundform.trim() || grundform || null

    setIsLoading(true)
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          grundform: finalGrundform,
          image_url: imageUrl.trim() || '',
          video_url: videoUrl.trim() || null,
          description: description.trim() || null,
          categories: [],
          muscle_groups: muscleGroups
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          equipment: equipment
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      })

      if (res.ok) {
        const exercise = await res.json()
        toast({
          title: 'Übung erstellt',
          description: `${exercise.name} wurde angelegt.`,
        })
        router.push(`/exercises/${exercise.id}`)
      } else {
        const error = await res.json()
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description: error.error || 'Konnte Übung nicht erstellen',
        })
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Ein Fehler ist aufgetreten',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Header
        title="Neue Übung"
        leftAction={
          <Button variant="ghost" size="icon" asChild>
            <Link href="/exercises">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        }
      />
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Übung erstellen</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name der Übung *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Back Squat, Sumo Deadlift"
                  required
                  minLength={2}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grundform">Grundform</Label>
                <Select
                  value={grundform}
                  onValueChange={(val) => {
                    setGrundform(val === 'none' ? '' : val)
                    if (val !== 'new') setNewGrundform('')
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
                {grundform === 'new' && (
                  <Input
                    value={newGrundform}
                    onChange={(e) => setNewGrundform(e.target.value)}
                    placeholder="Name der neuen Grundform"
                    className="mt-2"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  z.B. &quot;Squat&quot;, &quot;Deadlift&quot;, &quot;Bench Press&quot;
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="muscleGroups">Muskelgruppen</Label>
                <Input
                  id="muscleGroups"
                  value={muscleGroups}
                  onChange={(e) => setMuscleGroups(e.target.value)}
                  placeholder="z.B. Quadrizeps, Gluteus, Core"
                />
                <p className="text-xs text-muted-foreground">
                  Komma-getrennt eingeben
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment">Equipment</Label>
                <Input
                  id="equipment"
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  placeholder="z.B. Langhantel, Rack"
                />
                <p className="text-xs text-muted-foreground">
                  Komma-getrennt eingeben
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Bild URL (optional)</Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="videoUrl">Video URL (optional)</Label>
                <Input
                  id="videoUrl"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung (optional)</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kurze Beschreibung der Übung..."
                  className="w-full min-h-[80px] p-2 text-sm border rounded-lg"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isLoading || !name.trim()}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Erstellen
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/exercises">Abbrechen</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

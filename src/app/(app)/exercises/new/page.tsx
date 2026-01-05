'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function NewExercisePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          parent_exercise_id: null,
          image_url: '',
          categories: [],
          muscle_groups: [],
          equipment: [],
        }),
      })

      if (res.ok) {
        const exercise = await res.json()
        toast({
          title: 'Übung erstellt',
          description: `${exercise.name} wurde angelegt. Füge jetzt Varianten hinzu!`,
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
            <CardTitle className="text-base">Hauptübung erstellen</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name der Übung *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Deadlift, Squat, Bench Press"
                  required
                  minLength={2}
                  autoFocus
                />
                <p className="text-sm text-muted-foreground">
                  Hauptübungen sind Kategorien wie &quot;Deadlift&quot;.
                  Varianten wie &quot;Sumo Deadlift&quot; kannst du danach hinzufügen.
                </p>
              </div>
              <div className="flex gap-2">
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

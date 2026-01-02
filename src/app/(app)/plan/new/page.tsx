'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { mesocycleCreateSchema, type MesocycleCreateInput } from '@/lib/validations/plan'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Athlete {
  id: string
  name: string
}

export default function NewMesocyclePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAthletes, setIsLoadingAthletes] = useState(true)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MesocycleCreateInput>({
    resolver: zodResolver(mesocycleCreateSchema),
    defaultValues: {
      duration_weeks: 4,
      status: 'draft',
    },
  })

  const selectedAthleteId = watch('athlete_id')

  useEffect(() => {
    async function loadAthletes() {
      try {
        const response = await fetch('/api/athletes')
        if (!response.ok) throw new Error('Fehler beim Laden der Athleten')
        const data = await response.json()
        setAthletes(data)
      } catch {
        toast({
          title: 'Fehler',
          description: 'Athleten konnten nicht geladen werden',
          variant: 'destructive',
        })
      } finally {
        setIsLoadingAthletes(false)
      }
    }
    loadAthletes()
  }, [toast])

  const onSubmit = async (data: MesocycleCreateInput) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/mesocycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Erstellen')
      }

      const mesocycle = await response.json()

      toast({
        title: 'Erfolg',
        description: 'Mesozyklus wurde erstellt',
      })

      router.push(`/plan/${mesocycle.id}`)
    } catch (error) {
      toast({
        title: 'Fehler',
        description:
          error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Header
        title="Neuer Mesozyklus"
        leftAction={
          <Button asChild size="icon" variant="ghost">
            <Link href="/plan">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Zurück</span>
            </Link>
          </Button>
        }
      />
      <div className="p-4">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="z.B. Hypertrophie Block 1"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="athlete_id">Athlet *</Label>
                {isLoadingAthletes ? (
                  <div className="flex h-12 items-center justify-center rounded-lg border border-input bg-background">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : athletes.length === 0 ? (
                  <div className="flex h-12 items-center justify-center rounded-lg border border-input bg-background">
                    <p className="text-sm text-muted-foreground">
                      Keine Athleten vorhanden
                    </p>
                  </div>
                ) : (
                  <Select
                    value={selectedAthleteId}
                    onValueChange={(value) => setValue('athlete_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Athlet auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {athletes.map((athlete) => (
                        <SelectItem key={athlete.id} value={athlete.id}>
                          {athlete.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.athlete_id && (
                  <p className="text-sm text-destructive">
                    {errors.athlete_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration_weeks">Dauer (Wochen)</Label>
                <Input
                  id="duration_weeks"
                  type="number"
                  min={1}
                  max={52}
                  {...register('duration_weeks', { valueAsNumber: true })}
                />
                {errors.duration_weeks && (
                  <p className="text-sm text-destructive">
                    {errors.duration_weeks.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phase">Phase (optional)</Label>
                <Input
                  id="phase"
                  placeholder="z.B. Hypertrophie, Kraft, Deload"
                  {...register('phase')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Startdatum (optional)</Label>
                <Input id="start_date" type="date" {...register('start_date')} />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.back()}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading || isLoadingAthletes}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Erstellen
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

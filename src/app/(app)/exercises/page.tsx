import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Dumbbell } from 'lucide-react'
import Link from 'next/link'

interface Exercise {
  id: string
  name: string
  image_url: string | null
  categories: string[]
}

export default async function ExercisesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = (await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()) as { data: { role: string } | null }

  const isTrainer = profile?.role === 'trainer'

  // Fetch exercises
  const { data: exercises } = (await supabase
    .from('exercises')
    .select('*')
    .is('parent_exercise_id', null)
    .order('name')) as { data: Exercise[] | null }

  return (
    <>
      <Header
        title="Übungen"
        rightAction={
          isTrainer && (
            <Button asChild size="icon" variant="ghost">
              <Link href="/exercises/new">
                <Plus className="h-5 w-5" />
                <span className="sr-only">Neue Übung</span>
              </Link>
            </Button>
          )
        }
      />
      <div className="p-4">
        {(!exercises || exercises.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Dumbbell className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-center text-muted-foreground">
                {isTrainer
                  ? 'Noch keine Übungen vorhanden. Erstelle deine erste Übung!'
                  : 'Noch keine Übungen verfügbar.'}
              </p>
              {isTrainer && (
                <Button asChild className="mt-4">
                  <Link href="/exercises/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Erste Übung erstellen
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {exercises && exercises.length > 0 && (
          <div className="space-y-3">
            {exercises.map((exercise) => (
              <Link key={exercise.id} href={`/exercises/${exercise.id}`}>
                <Card className="transition-colors hover:bg-accent">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      {exercise.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={exercise.image_url}
                          alt={exercise.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Dumbbell className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h3 className="font-medium">{exercise.name}</h3>
                      {exercise.categories && exercise.categories.length > 0 && (
                        <p className="truncate text-sm text-muted-foreground">
                          {exercise.categories.join(', ')}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

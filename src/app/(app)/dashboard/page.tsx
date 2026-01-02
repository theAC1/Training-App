import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dumbbell, Flame, Trophy } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: { role: string; name: string } | null }

  const isTrainer = profile?.role === 'trainer'
  const greeting = getGreeting()

  return (
    <>
      <Header title="Dashboard" />
      <div className="space-y-4 p-4">
        <div>
          <h2 className="text-2xl font-bold">
            {greeting}, {profile?.name || 'Athlet'}!
          </h2>
          <p className="text-muted-foreground">
            {isTrainer
              ? 'Verwalte deine Athleten und Trainingspläne'
              : 'Bereit für dein Training?'}
          </p>
        </div>

        {!isTrainer && (
          <>
            {/* Streak Card */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="rounded-full bg-primary/10 p-3">
                  <Flame className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Streak</CardTitle>
                  <p className="text-2xl font-bold">0 Tage</p>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Starte dein erstes Training!
                </p>
              </CardContent>
            </Card>

            {/* PBs Card */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="rounded-full bg-warning/10 p-3">
                  <Trophy className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <CardTitle className="text-base">Personal Bests</CardTitle>
                  <p className="text-2xl font-bold">0 PBs</p>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Deine Bestleistungen erscheinen hier
                </p>
              </CardContent>
            </Card>

            {/* Next Session Card */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="rounded-full bg-accent p-3">
                  <Dumbbell className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-base">Nächstes Training</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Noch kein Training geplant. Dein Trainer wird bald einen Plan
                  erstellen.
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {isTrainer && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <p className="text-3xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Athleten</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <p className="text-3xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Aktive Pläne</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Erste Schritte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  1. Erstelle Übungen unter &quot;Übungen&quot;
                </p>
                <p className="text-sm text-muted-foreground">
                  2. Lade Athleten ein unter &quot;Athleten&quot;
                </p>
                <p className="text-sm text-muted-foreground">
                  3. Erstelle Trainingspläne unter &quot;Planung&quot;
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

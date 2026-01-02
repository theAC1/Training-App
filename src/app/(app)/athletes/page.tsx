import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Users, Copy } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Athlete {
  id: string
  name: string
  created_at: string
}

interface Invite {
  id: string
  code: string
  athlete_name: string | null
  expires_at: string
}

export default async function AthletesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = (await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()) as { data: { role: string } | null }

  // Only trainers can access this page
  if (profile?.role !== 'trainer') {
    redirect('/dashboard')
  }

  // Fetch athletes
  const { data: athletes } = (await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'athlete')
    .eq('trainer_id', user.id)
    .order('name')) as { data: Athlete[] | null }

  // Fetch pending invites
  const { data: invites } = (await supabase
    .from('invites')
    .select('*')
    .eq('created_by', user.id)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })) as { data: Invite[] | null }

  return (
    <>
      <Header
        title="Athleten"
        rightAction={
          <Button asChild size="sm">
            <a href="/api/auth/invite">
              <Plus className="mr-2 h-4 w-4" />
              Einladen
            </a>
          </Button>
        }
      />
      <div className="space-y-6 p-4">
        {/* Pending Invites */}
        {invites && invites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Offene Einladungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-lg bg-muted p-3"
                >
                  <div>
                    <p className="font-mono text-lg tracking-widest">
                      {invite.code}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {invite.athlete_name || 'Kein Name vorgegeben'} • Gültig
                      bis {formatDate(invite.expires_at)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Code kopieren</span>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Athletes List */}
        {(!athletes || athletes.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-center text-muted-foreground">
                Noch keine Athleten. Erstelle eine Einladung!
              </p>
            </CardContent>
          </Card>
        )}

        {athletes && athletes.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">
              Deine Athleten ({athletes.length})
            </h2>
            {athletes.map((athlete) => (
              <Card key={athlete.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-medium">{athlete.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Dabei seit {formatDate(athlete.created_at)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

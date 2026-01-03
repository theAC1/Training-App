'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  const isEnvError = error.message.includes('environment variables')

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive">Ein Fehler ist aufgetreten</CardTitle>
          <CardDescription>
            {isEnvError
              ? 'Die Anwendung ist nicht korrekt konfiguriert'
              : 'Beim Laden der Seite ist ein Fehler aufgetreten'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEnvError ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Die erforderlichen Umgebungsvariablen sind nicht gesetzt. Bitte stellen Sie sicher,
                dass folgende Variablen konfiguriert sind:
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>NEXT_PUBLIC_SUPABASE_URL</li>
                <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              </ul>
              <p className="pt-2 text-sm text-muted-foreground">
                Wenn Sie diese App auf Vercel deployen, fügen Sie diese Variablen in den
                Projekteinstellungen unter &quot;Environment Variables&quot; hinzu.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{error.message}</p>
          )}
          <Button onClick={reset} className="w-full">
            Erneut versuchen
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

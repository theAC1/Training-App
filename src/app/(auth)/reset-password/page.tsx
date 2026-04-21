'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

const resetSchema = z
  .object({
    password: z.string().min(8, 'Mindestens 8 Zeichen'),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    path: ['confirm'],
    message: 'Passwörter stimmen nicht überein',
  })

type ResetForm = z.infer<typeof resetSchema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session)
    })
  }, [supabase])

  const onSubmit = async (data: ResetForm) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description: error.message,
        })
        return
      }

      toast({
        title: 'Passwort aktualisiert',
        description: 'Du kannst dich jetzt mit dem neuen Passwort anmelden.',
      })
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Ein unerwarteter Fehler ist aufgetreten',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (hasSession === null) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!hasSession) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6 text-center">
          <h2 className="text-lg font-semibold">Link ungültig oder abgelaufen</h2>
          <p className="text-sm text-muted-foreground">
            Bitte fordere einen neuen Reset-Link an.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/forgot-password">Neuen Link anfordern</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Neues Passwort setzen</h2>
            <p className="text-sm text-muted-foreground">
              Wähle ein Passwort mit mindestens 8 Zeichen.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Neues Passwort</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Passwort bestätigen</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              {...register('confirm')}
            />
            {errors.confirm && (
              <p className="text-sm text-destructive">{errors.confirm.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Passwort speichern
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

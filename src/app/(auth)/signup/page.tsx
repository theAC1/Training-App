'use client'

import { useState } from 'react'
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

interface InviteData {
  athlete_name: string | null
  role: 'trainer' | 'athlete'
}

const signupSchema = z
  .object({
    inviteCode: z
      .string()
      .min(8, 'Code muss 8 Zeichen haben')
      .max(8, 'Code muss 8 Zeichen haben'),
    name: z.string().min(2, 'Mindestens 2 Zeichen'),
    email: z.string().email('Ungültige E-Mail-Adresse'),
    password: z.string().min(6, 'Mindestens 6 Zeichen'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
  })

type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true)
    try {
      // 1. Validate invite code
      const { data: invite, error: inviteError } = (await supabase
        .from('invites')
        .select('*')
        .eq('code', data.inviteCode.toUpperCase())
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()) as { data: InviteData | null; error: Error | null }

      if (inviteError || !invite) {
        toast({
          variant: 'destructive',
          title: 'Ungültiger Code',
          description:
            'Der Einladungscode ist ungültig oder bereits verwendet.',
        })
        setIsLoading(false)
        return
      }

      // 2. Create user account
      const { data: authData, error: signupError } = await supabase.auth.signUp(
        {
          email: data.email,
          password: data.password,
          options: {
            data: {
              name: invite.athlete_name || data.name,
              role: invite.role,
            },
          },
        }
      )

      if (signupError || !authData.user) {
        toast({
          variant: 'destructive',
          title: 'Fehler bei Registrierung',
          description: signupError?.message || 'Unbekannter Fehler',
        })
        setIsLoading(false)
        return
      }

      // 3. Mark invite as used (will be done by trigger/function on server)
      // The profile will be created by a database trigger

      toast({
        variant: 'success',
        title: 'Erfolgreich registriert',
        description: 'Du wirst weitergeleitet...',
      })

      router.push('/dashboard')
      router.refresh()
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

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="inviteCode">Einladungscode</Label>
            <Input
              id="inviteCode"
              placeholder="ABCD1234"
              className="uppercase tracking-widest"
              maxLength={8}
              {...register('inviteCode')}
            />
            {errors.inviteCode && (
              <p className="text-sm text-destructive">
                {errors.inviteCode.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Dein Name"
              autoComplete="name"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="deine@email.de"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrieren
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Bereits registriert?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Anmelden
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

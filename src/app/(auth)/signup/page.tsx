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
  athlete_id?: string // Only for athlete invites from athletes table
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
      const codeUpper = data.inviteCode.toUpperCase()
      let invite: InviteData | null = null

      // 1. First check the invites table (for trainer invites)
      const { data: inviteFromTable, error: inviteError } = (await supabase
        .from('invites')
        .select('*')
        .eq('code', codeUpper)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()) as { data: InviteData | null; error: Error | null }

      if (inviteFromTable && !inviteError) {
        invite = {
          athlete_name: inviteFromTable.athlete_name,
          role: inviteFromTable.role,
        }
      }

      // 2. If not found, check the athletes table (for athlete invites)
      if (!invite) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: athleteWithCode } = await (supabase as any)
          .from('athletes')
          .select('id, name, user_id, invite_expires_at')
          .eq('invite_code', codeUpper)
          .is('user_id', null) // Not yet linked to a user
          .gt('invite_expires_at', new Date().toISOString())
          .single()

        if (athleteWithCode) {
          invite = {
            athlete_name: athleteWithCode.name,
            role: 'athlete',
            athlete_id: athleteWithCode.id,
          }
        }
      }

      // 3. If still not found, show error
      if (!invite) {
        toast({
          variant: 'destructive',
          title: 'Ungültiger Code',
          description:
            'Der Einladungscode ist ungültig oder bereits verwendet.',
        })
        setIsLoading(false)
        return
      }

      // 4. Create user account
      const { data: authData, error: signupError } = await supabase.auth.signUp(
        {
          email: data.email,
          password: data.password,
          options: {
            data: {
              name: invite.athlete_name || data.name,
              role: invite.role,
              athlete_id: invite.athlete_id, // Pass athlete_id for linking
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

      // 5. If this was an athlete invite, link the athlete to the new user
      if (invite.athlete_id && authData.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('athletes')
          .update({
            user_id: authData.user.id,
            invite_code: null,
            invite_expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invite.athlete_id)
      }

      // 6. Mark invite as used (will be done by trigger/function on server)
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

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateInviteCode } from '@/lib/utils'

export async function GET() {
  // Redirect to athletes page with modal open (will be handled client-side)
  return NextResponse.redirect(new URL('/athletes?create=true', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Check if user is trainer
    const { data: profile } = (await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()) as { data: { role: string } | null }

    if (profile?.role !== 'trainer') {
      return NextResponse.json({ error: 'Nur Trainer können Einladungen erstellen' }, { status: 403 })
    }

    const body = await request.json()
    const { athleteName } = body

    // Generate unique invite code
    const code = generateInviteCode()

    // Set expiry to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invite, error } = await (supabase as any)
      .from('invites')
      .insert({
        code,
        role: 'athlete',
        athlete_name: athleteName || null,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating invite:', error)
      return NextResponse.json({ error: 'Fehler beim Erstellen der Einladung' }, { status: 500 })
    }

    return NextResponse.json({ invite })
  } catch (error) {
    console.error('Invite creation error:', error)
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}

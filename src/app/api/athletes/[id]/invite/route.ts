import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateInviteCode } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

type Athlete = Database['public']['Tables']['athletes']['Row']
type RouteParams = { params: Promise<{ id: string }> }

// POST /api/athletes/[id]/invite - Generate invite code for athlete
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Check if athlete exists and belongs to trainer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: athlete, error: athleteError } = (await (supabase as any)
      .from('athletes')
      .select('*')
      .eq('id', id)
      .eq('trainer_id', user.id)
      .single()) as { data: Athlete | null; error: Error | null }

    if (athleteError || !athlete) {
      return NextResponse.json({ error: 'Athlet nicht gefunden' }, { status: 404 })
    }

    // Check if athlete is already linked to a user
    if (athlete.user_id) {
      return NextResponse.json(
        { error: 'Athlet ist bereits mit einem Account verknüpft' },
        { status: 400 }
      )
    }

    // Generate new invite code
    const inviteCode = generateInviteCode()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedAthlete, error: updateError } = await (supabase as any)
      .from('athletes')
      .update({
        invite_code: inviteCode,
        invite_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      invite_code: inviteCode,
      expires_at: expiresAt.toISOString(),
      athlete: updatedAthlete,
    })
  } catch {
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// DELETE /api/athletes/[id]/invite - Revoke invite code
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('athletes')
      .update({
        invite_code: null,
        invite_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('trainer_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

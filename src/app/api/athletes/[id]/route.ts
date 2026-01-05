import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/athletes/[id] - Get single athlete
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    const { data: athlete, error } = await (supabase as any)
      .from('athletes')
      .select('*')
      .eq('id', id)
      .eq('trainer_id', user.id)
      .single()

    if (error || !athlete) {
      return NextResponse.json({ error: 'Athlet nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(athlete)
  } catch {
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// PATCH /api/athletes/[id] - Update athlete
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, notes } = body

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name.trim()
    if (email !== undefined) updateData.email = email?.trim() || null
    if (notes !== undefined) updateData.notes = notes?.trim() || null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: athlete, error } = await (supabase as any)
      .from('athletes')
      .update(updateData)
      .eq('id', id)
      .eq('trainer_id', user.id)
      .select()
      .single()

    if (error || !athlete) {
      return NextResponse.json({ error: 'Athlet nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(athlete)
  } catch {
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// DELETE /api/athletes/[id] - Delete athlete
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
      .delete()
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

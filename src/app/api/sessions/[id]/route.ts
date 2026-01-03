import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sessionUpdateSchema } from '@/lib/validations/plan'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/sessions/[id] - Get single session with blocks
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { data: session, error } = await supabase
      .from('sessions')
      .select(`
        *,
        mesocycles (id, name, athlete_id),
        session_blocks (
          *,
          planned_exercises (
            *,
            exercises (id, name, image_url)
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Session nicht gefunden' },
          { status: 404 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(session)
  } catch {
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// PUT /api/sessions/[id] - Update session
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Check if user is trainer
    const { data: profile } = (await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()) as { data: { role: string } | null }

    if (profile?.role !== 'trainer') {
      return NextResponse.json(
        { error: 'Nur Trainer können Sessions bearbeiten' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = sessionUpdateSchema.parse({ ...body, id })

    const { id: _, ...updateData } = validatedData

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error } = await (supabase
      .from('sessions') as any)
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(session)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Ungültige Daten', details: error },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// DELETE /api/sessions/[id] - Delete session
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Check if user is trainer
    const { data: profile } = (await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()) as { data: { role: string } | null }

    if (profile?.role !== 'trainer') {
      return NextResponse.json(
        { error: 'Nur Trainer können Sessions löschen' },
        { status: 403 }
      )
    }

    const { error } = await supabase.from('sessions').delete().eq('id', id)

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

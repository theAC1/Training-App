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

    // Check user role
    const { data: profile } = (await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()) as { data: { role: string } | null }

    const body = await request.json()
    const isTrainer = profile?.role === 'trainer'

    // Athletes can only update started_at and completed_at
    if (!isTrainer) {
      // Check if athlete is updating their own session
      const { data: sessionCheck } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from('sessions')
        .select('id, mesocycles!inner(athlete_id)')
        .eq('id', id)
        .single()

      const mesoData = sessionCheck?.mesocycles
      if (!sessionCheck || mesoData?.athlete_id !== user.id) {
        // Also check athletes table
        const { data: athleteCheck } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
          .from('athletes')
          .select('id')
          .eq('user_id', user.id)
          .eq('id', mesoData?.athlete_id)
          .single()

        if (!athleteCheck) {
          return NextResponse.json(
            { error: 'Keine Berechtigung für diese Session' },
            { status: 403 }
          )
        }
      }

      // Only allow started_at and completed_at updates for athletes
      const allowedFields = ['started_at', 'completed_at']
      const filteredBody: Record<string, unknown> = {}
      for (const field of allowedFields) {
        if (field in body) {
          filteredBody[field] = body[field]
        }
      }

      if (Object.keys(filteredBody).length === 0) {
        return NextResponse.json(
          { error: 'Keine erlaubten Felder zum Aktualisieren' },
          { status: 400 }
        )
      }

      const { data: session, error } = await (supabase
        .from('sessions') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update(filteredBody)
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(session)
    }

    // Trainer can update all fields
    const validatedData = sessionUpdateSchema.parse({ ...body, id })
    const { id: _, ...updateData } = validatedData

    const { data: session, error } = await (supabase
      .from('sessions') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
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

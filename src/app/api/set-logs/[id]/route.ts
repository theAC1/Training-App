import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { setLogUpdateSchema } from '@/lib/validations/plan'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/set-logs/[id] - Get single set log
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

    const { data: setLog, error } = await supabase
      .from('set_logs')
      .select(
        `
        *,
        planned_exercises (
          id,
          exercise_id,
          exercises (id, name)
        )
      `
      )
      .eq('id', id)
      .eq('athlete_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Set Log nicht gefunden' },
          { status: 404 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(setLog)
  } catch {
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// PUT /api/set-logs/[id] - Update set log
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

    const body = await request.json()
    const validatedData = setLogUpdateSchema.parse({ ...body, id })
    const { id: _, ...updateData } = validatedData

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: setLog, error } = await (supabase.from('set_logs') as any)
      .update({
        ...updateData,
        synced_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('athlete_id', user.id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(setLog)
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

// DELETE /api/set-logs/[id] - Delete set log
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

    const { error } = await supabase
      .from('set_logs')
      .delete()
      .eq('id', id)
      .eq('athlete_id', user.id)

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

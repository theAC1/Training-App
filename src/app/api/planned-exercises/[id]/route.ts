import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { plannedExerciseUpdateSchema } from '@/lib/validations/plan'

type RouteContext = { params: Promise<{ id: string }> }

// PUT /api/planned-exercises/[id] - Update planned exercise
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
        { error: 'Nur Trainer können Übungen bearbeiten' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = plannedExerciseUpdateSchema.parse({ ...body, id })

    const { id: _, ...updateData } = validatedData

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: plannedExercise, error } = await (supabase
      .from('planned_exercises') as any)
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        exercises (id, name, image_url)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(plannedExercise)
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

// DELETE /api/planned-exercises/[id] - Delete planned exercise
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
        { error: 'Nur Trainer können Übungen löschen' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('planned_exercises')
      .delete()
      .eq('id', id)

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

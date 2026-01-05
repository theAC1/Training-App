import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { plannedExerciseCreateSchema } from '@/lib/validations/plan'

// POST /api/planned-exercises - Create new planned exercise
export async function POST(request: NextRequest) {
  try {
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
        { error: 'Nur Trainer können Übungen planen' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = plannedExerciseCreateSchema.parse(body)

    const { data: plannedExercise, error } = await (supabase
      .from('planned_exercises') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .insert(validatedData)
      .select(`
        *,
        exercises (id, name, image_url)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(plannedExercise, { status: 201 })
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

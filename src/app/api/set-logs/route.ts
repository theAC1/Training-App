import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { setLogCreateSchema } from '@/lib/validations/plan'

// GET /api/set-logs - Get set logs for athlete
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const plannedExerciseId = searchParams.get('planned_exercise_id')
    const exerciseId = searchParams.get('exercise_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
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
      .eq('athlete_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(limit)

    if (plannedExerciseId) {
      query = query.eq('planned_exercise_id', plannedExerciseId)
    }

    if (exerciseId) {
      query = query.eq('planned_exercises.exercise_id', exerciseId)
    }

    const { data: setLogs, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(setLogs)
  } catch {
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// POST /api/set-logs - Create new set log
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = setLogCreateSchema.parse(body)

    // Check for duplicate using client_uuid (idempotency)
    const { data: existing } = await supabase
      .from('set_logs')
      .select('id')
      .eq('client_uuid', validatedData.client_uuid)
      .single()

    if (existing) {
      return NextResponse.json(existing, { status: 200 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: setLog, error } = await (supabase.from('set_logs') as any)
      .insert({
        ...validatedData,
        athlete_id: user.id,
        logged_at: validatedData.logged_at || new Date().toISOString(),
        synced_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(setLog, { status: 201 })
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

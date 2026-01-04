import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { setLogCreateSchema, setLogBatchCreateSchema } from '@/lib/validations/set-logs'

// POST /api/set-logs - Create new set log(s)
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

    // Check if this is a batch request
    if (body.logs && Array.isArray(body.logs)) {
      return handleBatchCreate(supabase, user.id, body)
    }

    // Single log creation
    const validatedData = setLogCreateSchema.parse(body)

    // Check for duplicate using client_uuid
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingLog } = await (supabase
      .from('set_logs') as any)
      .select('id')
      .eq('client_uuid', validatedData.client_uuid)
      .maybeSingle()

    if (existingLog) {
      // Return 409 Conflict to indicate duplicate
      return NextResponse.json(
        { error: 'Eintrag bereits vorhanden', id: existingLog.id },
        { status: 409 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: setLog, error } = await (supabase
      .from('set_logs') as any)
      .insert({
        ...validatedData,
        athlete_id: user.id,
        synced_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) {
      // Check for unique constraint violation (duplicate)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Eintrag bereits vorhanden' },
          { status: 409 }
        )
      }
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

// Handle batch creation with deduplication
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleBatchCreate(supabase: any, userId: string, body: unknown) {
  try {
    const validatedData = setLogBatchCreateSchema.parse(body)
    const clientUuids = validatedData.logs.map((log) => log.client_uuid)

    // Check for existing logs
    const { data: existingLogs } = await supabase
      .from('set_logs')
      .select('client_uuid')
      .in('client_uuid', clientUuids)

    const existingUuids = new Set(
      (existingLogs || []).map((log: { client_uuid: string }) => log.client_uuid)
    )

    // Filter out duplicates
    const newLogs = validatedData.logs
      .filter((log) => !existingUuids.has(log.client_uuid))
      .map((log) => ({
        ...log,
        athlete_id: userId,
        synced_at: new Date().toISOString(),
      }))

    if (newLogs.length === 0) {
      return NextResponse.json(
        {
          message: 'Alle Einträge bereits vorhanden',
          created: 0,
          duplicates: validatedData.logs.length,
        },
        { status: 200 }
      )
    }

    const { data: createdLogs, error } = await supabase
      .from('set_logs')
      .insert(newLogs)
      .select('*')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        logs: createdLogs,
        created: createdLogs.length,
        duplicates: validatedData.logs.length - newLogs.length,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Ungültige Daten', details: error },
        { status: 400 }
      )
    }
    throw error
  }
}

// GET /api/set-logs - Get set logs with filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null }

    const { searchParams } = new URL(request.url)
    const plannedExerciseId = searchParams.get('planned_exercise_id')
    const athleteId = searchParams.get('athlete_id')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('set_logs') as any)
      .select('*, planned_exercises(*, exercises(*))')
      .order('logged_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Athletes can only see their own logs
    if (profile?.role === 'athlete') {
      query = query.eq('athlete_id', user.id)
    } else if (athleteId) {
      // Trainers can filter by athlete
      query = query.eq('athlete_id', athleteId)
    }

    if (plannedExerciseId) {
      query = query.eq('planned_exercise_id', plannedExerciseId)
    }

    const { data: logs, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(logs)
  } catch {
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

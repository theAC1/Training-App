import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

interface ExerciseSummary {
  planned_exercise_id: string
  exercise_name: string
  sets_target: number
  sets_completed: number
  total_reps: number
  total_volume: number
  pain_flags: number
  logs: Array<{
    set_number: number
    reps_completed: number
    weight_used: number | null
    pain_flag: boolean
    logged_at: string
  }>
}

// GET /api/sessions/[id]/summary - Aggregated summary after session completion
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sessionData, error: sessionError } = await (supabase.from('sessions') as any)
      .select(`
        id,
        name,
        week_number,
        started_at,
        completed_at,
        notes,
        mesocycles (id, name, athlete_id),
        session_blocks (
          id,
          order_index,
          planned_exercises (
            id,
            sets_target,
            order_in_block,
            exercises (id, name)
          )
        )
      `)
      .eq('id', id)
      .single()

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { error: 'Session nicht gefunden' },
        { status: 404 }
      )
    }

    const session = sessionData as {
      id: string
      name: string | null
      week_number: number
      started_at: string | null
      completed_at: string | null
      notes: string | null
      mesocycles: { id: string; name: string; athlete_id: string } | null
      session_blocks: Array<{
        id: string
        order_index: number
        planned_exercises: Array<{
          id: string
          sets_target: number
          order_in_block: number
          exercises: { id: string; name: string } | null
        }>
      }>
    }

    const plannedExerciseIds: string[] = []
    const plannedMeta = new Map<
      string,
      { name: string; sets_target: number; block_order: number; order_in_block: number }
    >()

    for (const block of session.session_blocks || []) {
      for (const pe of block.planned_exercises || []) {
        plannedExerciseIds.push(pe.id)
        plannedMeta.set(pe.id, {
          name: pe.exercises?.name ?? 'Übung',
          sets_target: pe.sets_target,
          block_order: block.order_index,
          order_in_block: pe.order_in_block,
        })
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: logs, error: logsError } = await (supabase.from('set_logs') as any)
      .select('planned_exercise_id, set_number, reps_completed, weight_used, pain_flag, logged_at')
      .in('planned_exercise_id', plannedExerciseIds.length > 0 ? plannedExerciseIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('athlete_id', user.id)
      .order('logged_at', { ascending: true })

    if (logsError) {
      return NextResponse.json({ error: logsError.message }, { status: 500 })
    }

    const exerciseMap = new Map<string, ExerciseSummary>()
    for (const [peId, meta] of plannedMeta.entries()) {
      exerciseMap.set(peId, {
        planned_exercise_id: peId,
        exercise_name: meta.name,
        sets_target: meta.sets_target,
        sets_completed: 0,
        total_reps: 0,
        total_volume: 0,
        pain_flags: 0,
        logs: [],
      })
    }

    type LogRow = {
      planned_exercise_id: string
      set_number: number
      reps_completed: number
      weight_used: number | string | null
      pain_flag: boolean
      logged_at: string
    }

    let totalSets = 0
    let totalReps = 0
    let totalVolume = 0
    let totalPainFlags = 0

    for (const log of (logs || []) as LogRow[]) {
      const entry = exerciseMap.get(log.planned_exercise_id)
      if (!entry) continue

      const weight =
        log.weight_used === null || log.weight_used === undefined
          ? null
          : typeof log.weight_used === 'string'
            ? parseFloat(log.weight_used)
            : log.weight_used

      entry.sets_completed += 1
      entry.total_reps += log.reps_completed
      entry.total_volume += weight ? log.reps_completed * weight : 0
      if (log.pain_flag) entry.pain_flags += 1
      entry.logs.push({
        set_number: log.set_number,
        reps_completed: log.reps_completed,
        weight_used: weight,
        pain_flag: log.pain_flag,
        logged_at: log.logged_at,
      })

      totalSets += 1
      totalReps += log.reps_completed
      totalVolume += weight ? log.reps_completed * weight : 0
      if (log.pain_flag) totalPainFlags += 1
    }

    const exercises = Array.from(exerciseMap.values()).sort((a, b) => {
      const ma = plannedMeta.get(a.planned_exercise_id)!
      const mb = plannedMeta.get(b.planned_exercise_id)!
      if (ma.block_order !== mb.block_order) return ma.block_order - mb.block_order
      return ma.order_in_block - mb.order_in_block
    })

    const targetSets = exercises.reduce((sum, ex) => sum + ex.sets_target, 0)

    const started = session.started_at ? new Date(session.started_at).getTime() : null
    const completed = session.completed_at ? new Date(session.completed_at).getTime() : null
    const durationSeconds =
      started && completed ? Math.max(0, Math.round((completed - started) / 1000)) : null

    return NextResponse.json({
      session: {
        id: session.id,
        name: session.name,
        week_number: session.week_number,
        started_at: session.started_at,
        completed_at: session.completed_at,
        notes: session.notes,
        mesocycle: session.mesocycles,
      },
      totals: {
        duration_seconds: durationSeconds,
        sets_completed: totalSets,
        sets_target: targetSets,
        total_reps: totalReps,
        total_volume: Math.round(totalVolume * 100) / 100,
        pain_flags: totalPainFlags,
      },
      exercises,
    })
  } catch {
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

type RouteContext = { params: Promise<{ id: string }> }

const copySchema = z.object({
  athlete_id: z.string().uuid('Ungültige Athleten-ID'),
  name: z.string().min(1, 'Name ist erforderlich').optional(),
})

// POST /api/mesocycles/[id]/copy - Copy mesocycle to another athlete
export async function POST(request: NextRequest, context: RouteContext) {
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
        { error: 'Nur Trainer können Mesozyklen kopieren' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { athlete_id, name } = copySchema.parse(body)

    // 1. Get the original mesocycle with all related data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: original, error: fetchError } = await (supabase as any)
      .from('mesocycles')
      .select(`
        *,
        sessions (
          *,
          session_blocks (
            *,
            planned_exercises (*)
          )
        )
      `)
      .eq('id', id)
      .single()

    if (fetchError || !original) {
      return NextResponse.json(
        { error: 'Mesozyklus nicht gefunden' },
        { status: 404 }
      )
    }

    // 2. Create new mesocycle for the target athlete
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newMeso, error: mesoError } = await (supabase as any)
      .from('mesocycles')
      .insert({
        athlete_id,
        name: name || `${original.name} (Kopie)`,
        phase: original.phase,
        duration_weeks: original.duration_weeks,
        status: 'draft', // Always start as draft
        created_by: user.id,
      })
      .select()
      .single()

    if (mesoError) {
      console.error('Error creating mesocycle:', mesoError)
      return NextResponse.json({ error: mesoError.message }, { status: 500 })
    }

    // 3. Copy sessions
    const sessions = original.sessions || []
    for (const session of sessions) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newSession, error: sessionError } = await (supabase as any)
        .from('sessions')
        .insert({
          mesocycle_id: newMeso.id,
          week_number: session.week_number,
          day_of_week: session.day_of_week,
          name: session.name,
          order_index: session.order_index,
          notes: session.notes,
        })
        .select()
        .single()

      if (sessionError) {
        console.error('Error creating session:', sessionError)
        continue
      }

      // 4. Copy blocks for this session
      const blocks = session.session_blocks || []
      for (const block of blocks) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newBlock, error: blockError } = await (supabase as any)
          .from('session_blocks')
          .insert({
            session_id: newSession.id,
            block_type: block.block_type,
            order_index: block.order_index,
            rest_between_rounds: block.rest_between_rounds,
            notes: block.notes,
          })
          .select()
          .single()

        if (blockError) {
          console.error('Error creating block:', blockError)
          continue
        }

        // 5. Copy planned exercises for this block
        const exercises = block.planned_exercises || []
        for (const exercise of exercises) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('planned_exercises')
            .insert({
              block_id: newBlock.id,
              exercise_id: exercise.exercise_id,
              order_in_block: exercise.order_in_block,
              sets_target: exercise.sets_target,
              reps_target: exercise.reps_target,
              weight_prescribed: exercise.weight_prescribed,
              rir: exercise.rir,
              rest_time_default: exercise.rest_time_default,
              notes: exercise.notes,
              cluster_reps: exercise.cluster_reps,
              cluster_count: exercise.cluster_count,
              intra_cluster_rest: exercise.intra_cluster_rest,
            })
        }
      }
    }

    return NextResponse.json({
      message: 'Mesozyklus erfolgreich kopiert',
      mesocycle: newMeso,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ungültige Daten', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Copy error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/exercises/[id] - Get single exercise with related exercises
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

    // Get the exercise
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: exercise, error } = await (supabase as any)
      .from('exercises')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !exercise) {
      return NextResponse.json({ error: 'Übung nicht gefunden' }, { status: 404 })
    }

    // Get related exercises (same grundform, different id)
    let relatedExercises: unknown[] = []
    if (exercise.grundform) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: related } = await (supabase as any)
        .from('exercises')
        .select('id, name, image_url')
        .eq('grundform', exercise.grundform)
        .neq('id', id)
        .order('name')

      relatedExercises = related || []
    }

    return NextResponse.json({
      ...exercise,
      related_exercises: relatedExercises,
    })
  } catch {
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// PATCH /api/exercises/[id] - Update exercise
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
    const { name, grundform, image_url, video_url, categories, muscle_groups, equipment, description, purpose_note } = body

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name.trim()
    if (grundform !== undefined) updateData.grundform = grundform || null
    if (image_url !== undefined) updateData.image_url = image_url || ''
    if (video_url !== undefined) updateData.video_url = video_url || null
    if (categories !== undefined) updateData.categories = categories
    if (muscle_groups !== undefined) updateData.muscle_groups = muscle_groups
    if (equipment !== undefined) updateData.equipment = equipment
    if (description !== undefined) updateData.description = description || null
    if (purpose_note !== undefined) updateData.purpose_note = purpose_note || null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: exercise, error } = await (supabase as any)
      .from('exercises')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error || !exercise) {
      return NextResponse.json({ error: 'Übung nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(exercise)
  } catch {
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// DELETE /api/exercises/[id] - Delete exercise
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

    // Delete exercise (cascades to variations if set up)
    const { error } = await supabase
      .from('exercises')
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

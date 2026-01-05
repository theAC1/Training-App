import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/exercises - List all exercises
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { data: exercises, error } = await supabase
      .from('exercises')
      .select('id, name, image_url, categories, muscle_groups')
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(exercises)
  } catch {
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// POST /api/exercises - Create new exercise or variation
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
    const {
      name,
      parent_exercise_id,
      image_url,
      video_url,
      categories,
      muscle_groups,
      equipment,
      description,
      purpose_note,
    } = body

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name muss mindestens 2 Zeichen haben' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: exercise, error } = await (supabase as any)
      .from('exercises')
      .insert({
        name: name.trim(),
        parent_exercise_id: parent_exercise_id || null,
        image_url: image_url || '',
        video_url: video_url || null,
        categories: categories || [],
        muscle_groups: muscle_groups || [],
        equipment: equipment || [],
        description: description || null,
        purpose_note: purpose_note || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(exercise, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

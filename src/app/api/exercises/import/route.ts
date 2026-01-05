import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface CSVExercise {
  name: string
  grundform?: string
  image_url?: string
  video_url?: string
  categories?: string
  muscle_groups?: string
  equipment?: string
  description?: string
}

// POST /api/exercises/import - Import exercises from CSV data
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
        { error: 'Nur Trainer können Übungen importieren' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { exercises } = body as { exercises: CSVExercise[] }

    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json(
        { error: 'Keine Übungen zum Importieren' },
        { status: 400 }
      )
    }

    if (exercises.length > 100) {
      return NextResponse.json(
        { error: 'Maximal 100 Übungen pro Import' },
        { status: 400 }
      )
    }

    // Validate and prepare exercises
    const validExercises = []
    const errors = []

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i]

      if (!ex.name || ex.name.trim().length < 2) {
        errors.push(`Zeile ${i + 1}: Name fehlt oder zu kurz`)
        continue
      }

      // Parse comma-separated arrays
      const parseArray = (str?: string): string[] => {
        if (!str) return []
        return str.split(',').map(s => s.trim()).filter(s => s.length > 0)
      }

      validExercises.push({
        name: ex.name.trim(),
        grundform: ex.grundform?.trim() || null,
        image_url: ex.image_url?.trim() || '',
        video_url: ex.video_url?.trim() || null,
        categories: parseArray(ex.categories),
        muscle_groups: parseArray(ex.muscle_groups),
        equipment: parseArray(ex.equipment),
        description: ex.description?.trim() || null,
        purpose_note: null,
        created_by: user.id,
      })
    }

    if (validExercises.length === 0) {
      return NextResponse.json(
        { error: 'Keine gültigen Übungen gefunden', details: errors },
        { status: 400 }
      )
    }

    // Insert exercises
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error } = await (supabase as any)
      .from('exercises')
      .insert(validExercises)
      .select('id, name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: `${inserted.length} Übungen importiert`,
      imported: inserted.length,
      errors: errors.length > 0 ? errors : undefined,
    }, { status: 201 })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

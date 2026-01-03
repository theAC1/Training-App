import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

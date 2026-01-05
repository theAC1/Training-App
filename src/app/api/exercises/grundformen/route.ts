import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/exercises/grundformen - Get distinct grundformen
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Get distinct grundformen with count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: exercises, error } = await (supabase as any)
      .from('exercises')
      .select('grundform')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by grundform and count
    const grundformenMap = new Map<string, number>()
    for (const ex of exercises || []) {
      if (ex.grundform) {
        grundformenMap.set(ex.grundform, (grundformenMap.get(ex.grundform) || 0) + 1)
      }
    }

    // Convert to array and sort
    const grundformen = Array.from(grundformenMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json(grundformen)
  } catch {
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

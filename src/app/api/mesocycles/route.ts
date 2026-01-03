import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { mesocycleCreateSchema } from '@/lib/validations/plan'

// GET /api/mesocycles - List all mesocycles for trainer
export async function GET() {
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
      return NextResponse.json({ error: 'Nur Trainer haben Zugriff' }, { status: 403 })
    }

    const { data: mesocycles, error } = await supabase
      .from('mesocycles')
      .select(`
        *,
        profiles:athlete_id (id, name)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(mesocycles)
  } catch {
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// POST /api/mesocycles - Create new mesocycle
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
      return NextResponse.json({ error: 'Nur Trainer können Mesozyklen erstellen' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = mesocycleCreateSchema.parse(body)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: mesocycle, error } = await (supabase
      .from('mesocycles') as any)
      .insert({
        ...validatedData,
        created_by: user.id,
      })
      .select(`
        *,
        profiles:athlete_id (id, name)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(mesocycle, { status: 201 })
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

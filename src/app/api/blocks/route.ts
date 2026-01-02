import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { blockCreateSchema } from '@/lib/validations/plan'

// POST /api/blocks - Create new block
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
        { error: 'Nur Trainer können Blöcke erstellen' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = blockCreateSchema.parse(body)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: block, error } = await (supabase
      .from('session_blocks') as any)
      .insert(validatedData)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(block, { status: 201 })
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

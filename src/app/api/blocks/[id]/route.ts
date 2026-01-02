import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { blockUpdateSchema } from '@/lib/validations/plan'
import type { Database } from '@/lib/database.types'

type BlockUpdate = Database['public']['Tables']['session_blocks']['Update']

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/blocks/[id] - Get single block with exercises
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { data: block, error } = await supabase
      .from('session_blocks')
      .select(`
        *,
        planned_exercises (
          *,
          exercises (id, name, image_url)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Block nicht gefunden' },
          { status: 404 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(block)
  } catch {
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

// PUT /api/blocks/[id] - Update block
export async function PUT(request: NextRequest, context: RouteContext) {
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
        { error: 'Nur Trainer können Blöcke bearbeiten' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = blockUpdateSchema.parse({ ...body, id })

    const updateData: BlockUpdate = {}
    if (validatedData.block_type !== undefined) updateData.block_type = validatedData.block_type
    if (validatedData.order_index !== undefined) updateData.order_index = validatedData.order_index
    if (validatedData.rest_between_rounds !== undefined) updateData.rest_between_rounds = validatedData.rest_between_rounds
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes
    if (validatedData.session_id !== undefined) updateData.session_id = validatedData.session_id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: block, error } = await (supabase
      .from('session_blocks') as any)
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(block)
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

// DELETE /api/blocks/[id] - Delete block
export async function DELETE(request: NextRequest, context: RouteContext) {
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
        { error: 'Nur Trainer können Blöcke löschen' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('session_blocks')
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

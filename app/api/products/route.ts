import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)
  const all = searchParams.get('all') === 'true'

  let query = supabase
    .from('products')
    .select('id, name, category, entity, created_at, archived')
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (!all) {
    query = query.neq('archived', true)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, category, entity } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  }

  if (!category || typeof category !== 'string') {
    return NextResponse.json({ error: 'Category is required.' }, { status: 400 })
  }

  if (!entity || typeof entity !== 'string') {
    return NextResponse.json({ error: 'Entity is required.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('products')
    .insert({ name: name.trim(), category, entity, archived: false })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}

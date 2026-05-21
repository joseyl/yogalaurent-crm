import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const userEmail = user.emailAddresses[0]?.emailAddress
  let addedBy: string
  if (userEmail === process.env.JOSE_EMAIL) addedBy = 'Jose'
  else if (userEmail === process.env.LAURENT_EMAIL) addedBy = 'Laurent'
  else return NextResponse.json({ error: 'Unauthorised user' }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { person_id, product_id, source, notes } = body

  if (!person_id || !product_id) {
    return NextResponse.json({ error: 'person_id and product_id are required.' }, { status: 400 })
  }

  const supabase = createServerClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('interests')
    .insert({
      person_id,
      product_id,
      source: source ?? null,
      notes: notes ?? null,
      added_by: addedBy,
      added_date: today,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'This person is already tagged as interested in that product.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required.' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { error } = await supabase.from('interests').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

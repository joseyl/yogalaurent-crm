import { supabaseAdmin } from './supabase-admin'

interface PersonData {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
}

export async function findOrCreatePerson(data: PersonData): Promise<string | null> {
  const email = data.email.toLowerCase().trim()

  const { data: byEmail } = await supabaseAdmin
    .from('people')
    .select('id')
    .eq('email', email)
    .single()

  if (byEmail) return byEmail.id

  const { data: byAltEmail } = await supabaseAdmin
    .from('people')
    .select('id')
    .eq('alt_email', email)
    .single()

  if (byAltEmail) return byAltEmail.id

  const { data: newPerson, error } = await supabaseAdmin
    .from('people')
    .insert({
      email,
      first_name: data.firstName || null,
      last_name: data.lastName || null,
      phone: data.phone || null,
      status: 'client',
      assigned_to: 'Jose',
      source_channel: 'Momence',
    })
    .select('id')
    .single()

  if (error || !newPerson) return null
  return newPerson.id
}

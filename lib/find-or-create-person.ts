import { supabaseAdmin } from './supabase-admin'
import { findPersonByEmail } from './findPersonByEmail'

interface PersonData {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  /** Where this person came from. Defaults to Momence so existing callers are unchanged. */
  sourceChannel?: string
  country?: string
}

async function logFailure(email: string, err: { code: string; message: string } | null) {
  try {
    await supabaseAdmin.from('webhook_log').insert({
      source: 'crm',
      event_type: 'find_or_create_person',
      status: 'failed',
      payload: { email },
      error_message: err ? `${err.code}: ${err.message}` : 'unknown error',
    })
  } catch {
    // ignore log failures
  }
}

/**
 * Finds a person by main email, alt_email or other email (Build D, migration 014), or
 * creates one. Two records sharing an alt_email: the oldest is used, as before.
 */
export async function findOrCreatePerson(data: PersonData): Promise<string | null> {
  const email = data.email.toLowerCase().trim()

  try {
    const found = await findPersonByEmail(email)
    if (found) return found.id
  } catch (err) {
    await logFailure(email, err as { code: string; message: string })
    return null
  }

  // Insert new person
  const { data: newPerson, error: insertError } = await supabaseAdmin
    .from('people')
    .insert({
      email,
      first_name: data.firstName || null,
      last_name: data.lastName || null,
      phone: data.phone || null,
      country: data.country || null,
      status: 'client',
      assigned_to: 'Jose',
      source_channel: data.sourceChannel || 'Momence',
    })
    .select('id')
    .single()

  if (!insertError && newPerson) return newPerson.id

  // On duplicate key (created meanwhile, or the address is someone's other email), read it back
  if (insertError?.code === '23505') {
    try {
      const existing = await findPersonByEmail(email)
      if (existing) return existing.id
    } catch {
      // fall through to failure log
    }
  }

  // Final failure path
  await logFailure(email, insertError ? { code: insertError.code, message: insertError.message } : null)
  return null
}

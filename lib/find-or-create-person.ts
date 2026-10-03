import { supabaseAdmin } from './supabase-admin'

interface PersonData {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  /** Where this person came from. Defaults to Momence so existing callers are unchanged. */
  sourceChannel?: string
  country?: string
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function lookupByField(
  field: 'email' | 'alt_email',
  value: string,
): Promise<{ id: string } | null> {
  const delays = [0, 300, 600]
  let lastError: { code: string; message: string } | null = null

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) await sleep(delays[attempt])

    const { data, error } = await supabaseAdmin
      .from('people')
      .select('id')
      .eq(field, value)
      .limit(1)

    if (error) {
      lastError = { code: error.code, message: error.message }
      continue
    }

    return data && data.length > 0 ? data[0] : null
  }

  // All retries exhausted; propagate the error as a thrown value
  throw lastError
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

export async function findOrCreatePerson(data: PersonData): Promise<string | null> {
  const email = data.email.toLowerCase().trim()

  // Look up by primary email
  let byEmail: { id: string } | null = null
  try {
    byEmail = await lookupByField('email', email)
  } catch (err) {
    await logFailure(email, err as { code: string; message: string })
    return null
  }
  if (byEmail) return byEmail.id

  // Look up by alt_email
  let byAltEmail: { id: string } | null = null
  try {
    byAltEmail = await lookupByField('alt_email', email)
  } catch (err) {
    await logFailure(email, err as { code: string; message: string })
    return null
  }
  if (byAltEmail) return byAltEmail.id

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

  // On duplicate key, re-fetch the existing row
  if (insertError?.code === '23505') {
    let existing: { id: string } | null = null
    try {
      existing = await lookupByField('email', email)
    } catch {
      // fall through to failure log
    }
    if (existing) return existing.id
  }

  // Final failure path
  await logFailure(email, insertError ? { code: insertError.code, message: insertError.message } : null)
  return null
}

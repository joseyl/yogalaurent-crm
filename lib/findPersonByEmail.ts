import { supabaseAdmin } from './supabase-admin'

/**
 * The one lookup by email (Build D, migration 014). Checks the main email, then alt_email,
 * then the other emails (person_emails), ignoring case and spaces. Never creates anyone.
 *
 * Returns the person found first, where it was found and how many people matched at that
 * step. matches above 1 means two records share that address: strict feeds treat it as no
 * match (see findOnePersonId), findOrCreatePerson takes the oldest record as before.
 */
export interface EmailMatch {
  id: string
  matchedOn: 'email' | 'alt_email' | 'other_email'
  matches: number
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function findPersonByEmail(email: string | null | undefined): Promise<EmailMatch | null> {
  const value = (email ?? '').toLowerCase().replace(/\s/g, '')
  if (!value || !value.includes('@')) return null

  const delays = [0, 300, 600]
  let lastError: { code: string; message: string } | null = null
  for (const delay of delays) {
    if (delay > 0) await sleep(delay)
    const { data, error } = await supabaseAdmin.rpc('find_person_by_email', { p_email: value })
    if (error) {
      lastError = { code: error.code, message: error.message }
      continue
    }
    const row = (data as { person_id: string; matched_on: EmailMatch['matchedOn']; matches: number }[] | null)?.[0]
    return row ? { id: row.person_id, matchedOn: row.matched_on, matches: Number(row.matches) } : null
  }
  throw lastError
}

/** Strict version for feeds that must never guess: one person, or null. */
export async function findOnePersonId(email: string | null | undefined): Promise<string | null> {
  const m = await findPersonByEmail(email)
  return m && m.matches === 1 ? m.id : null
}

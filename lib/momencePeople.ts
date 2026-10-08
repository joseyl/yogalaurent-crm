import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchAll } from '@/lib/fetchAll'

/**
 * Finds CRM people for Momence members, and creates new ones when allowed.
 *
 * Match order: Momence member number, then email, then alt_email.
 * A new person gets status client, source channel "Momence" and their member number.
 * A matched person without a member number gets it saved (never overwritten).
 * Used by the nightly class copy (lib/momenceSync.ts) and the sales import
 * (lib/momenceSales.ts). Creating people only happens when the Momence import is live.
 */

export interface MomenceMemberRef {
  memberId?: number | string | null
  email?: string | null
  name?: string | null
  firstName?: string | null
  lastName?: string | null
}

export class MomencePeople {
  private byMember = new Map<string, string>()
  private byEmail = new Map<string, string>()
  private byAlt = new Map<string, string>()
  private hasMember = new Set<string>()
  private memberToSave = new Map<string, string>() // person id -> member id
  created = 0

  static async load(): Promise<MomencePeople> {
    const mp = new MomencePeople()
    const people = await fetchAll<{ id: string; email: string | null; alt_email: string | null; momence_member_id: number | null }>(
      () => supabaseAdmin.from('people').select('id,email,alt_email,momence_member_id'),
    )
    for (const p of people) {
      if (p.momence_member_id != null) {
        mp.hasMember.add(p.id)
        if (!mp.byMember.has(String(p.momence_member_id))) mp.byMember.set(String(p.momence_member_id), p.id)
      }
      if (p.email) mp.byEmail.set(p.email.toLowerCase().trim(), p.id)
      if (p.alt_email) mp.byAlt.set(p.alt_email.toLowerCase().trim(), p.id)
    }
    return mp
  }

  /** Finds the person, or null. Notes the member number for saving later. */
  match(ref: MomenceMemberRef): string | null {
    const member = ref.memberId != null && String(ref.memberId) !== '' ? String(ref.memberId) : null
    const email = (ref.email ?? '').toLowerCase().trim()
    let id: string | null = null
    if (member) id = this.byMember.get(member) ?? null
    if (!id && email) id = this.byEmail.get(email) ?? this.byAlt.get(email) ?? null
    if (id && member && !this.hasMember.has(id) && !this.memberToSave.has(id)) {
      this.memberToSave.set(id, member)
      this.byMember.set(member, id)
    }
    return id
  }

  /** Finds the person, or creates one. Returns null when there is no email to create with. */
  async matchOrCreate(ref: MomenceMemberRef): Promise<string | null> {
    const found = this.match(ref)
    if (found) return found
    const email = (ref.email ?? '').toLowerCase().trim()
    if (!email || !email.includes('@')) return null

    let first = (ref.firstName ?? '').trim()
    let last = (ref.lastName ?? '').trim()
    if (!first && !last && ref.name) {
      const parts = ref.name.trim().split(/\s+/)
      first = parts.shift() ?? ''
      last = parts.join(' ')
    }
    const member = ref.memberId != null && String(ref.memberId) !== '' ? Number(ref.memberId) : null

    const { data, error } = await supabaseAdmin
      .from('people')
      .insert({
        email,
        first_name: first || null,
        last_name: last || null,
        status: 'client',
        assigned_to: 'Jose',
        source_channel: 'Momence',
        momence_member_id: member,
      })
      .select('id')
      .single()

    let id: string | null = null
    if (!error && data) {
      id = data.id as string
      this.created++
      if (member != null) this.hasMember.add(id)
    } else if (error?.code === '23505') {
      // Created meanwhile (for example by the Zapier route): read it back
      const { data: again } = await supabaseAdmin.from('people').select('id').eq('email', email).limit(1)
      id = (again?.[0]?.id as string | undefined) ?? null
    } else {
      throw new Error(`Could not create a person from Momence: ${error?.message ?? 'unknown error'}`)
    }
    if (id) {
      this.byEmail.set(email, id)
      if (member != null) this.byMember.set(String(member), id)
    }
    return id
  }

  /** Saves member numbers found this run on people who had none. */
  async saveMemberNumbers(): Promise<number> {
    let saved = 0
    for (const [personId, member] of this.memberToSave) {
      const { error } = await supabaseAdmin
        .from('people')
        .update({ momence_member_id: Number(member) })
        .eq('id', personId)
        .is('momence_member_id', null)
      if (!error) saved++
    }
    this.memberToSave.clear()
    return saved
  }
}

/** The Momence import switch (table momence_import_settings, migration 009). */
export async function momenceImportSettings(): Promise<{ mode: 'off' | 'record_only' | 'live'; start_date: string | null }> {
  const { data, error } = await supabaseAdmin
    .from('momence_import_settings')
    .select('mode,start_date')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw new Error(`Could not read momence_import_settings: ${error.message}`)
  return { mode: (data?.mode as 'off' | 'record_only' | 'live') ?? 'off', start_date: (data?.start_date as string | null) ?? null }
}

/**
 * True when the API import owns Momence purchases on this London date (mode live and
 * the date on or after the start date). The old Zapier routes must not write a purchase then.
 * If the switch cannot be read, answers true, so a purchase is never written twice.
 */
export async function momenceApiOwnsPurchases(londonDate: string): Promise<boolean> {
  try {
    const s = await momenceImportSettings()
    return s.mode === 'live' && !!s.start_date && londonDate >= s.start_date
  } catch {
    return true
  }
}

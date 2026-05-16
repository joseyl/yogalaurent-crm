import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

export async function GET() {
  const supabase = createServerClient()
  const sevenDaysAgo = daysAgo(7)
  const twentyEightDaysAgo = daysAgo(28)
  const oneEightyDaysAgo = daysAgo(180)

  const [
    { data: openLeads },
    { data: attendance180 },
    { data: clients },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('id, last_followup_date, date_added, assigned_to, people(first_name, last_name)')
      .in('status', ['new', 'contacted', 'quoted']),
    supabase
      .from('attendance')
      .select('person_id, class_date')
      .gte('class_date', oneEightyDaysAgo),
    supabase
      .from('people')
      .select('id, first_name, last_name')
      .eq('status', 'client'),
  ])

  // Stale leads: no follow-up in 7+ days
  const staleLeads = (openLeads ?? [])
    .filter(lead => {
      if (!lead.last_followup_date) return lead.date_added <= sevenDaysAgo
      return lead.last_followup_date <= sevenDaysAgo
    })
    .sort((a, b) => {
      if (!a.last_followup_date && !b.last_followup_date) return a.date_added.localeCompare(b.date_added)
      if (!a.last_followup_date) return -1
      if (!b.last_followup_date) return 1
      return a.last_followup_date.localeCompare(b.last_followup_date)
    })
    .slice(0, 20)

  // Gone quiet: attended between 28-180 days ago but fewer than 2 classes in last 28 days
  const byPerson: Record<string, { recent: number; older: number }> = {}
  for (const a of attendance180 ?? []) {
    if (!byPerson[a.person_id]) byPerson[a.person_id] = { recent: 0, older: 0 }
    if (a.class_date >= twentyEightDaysAgo) {
      byPerson[a.person_id].recent++
    } else {
      byPerson[a.person_id].older++
    }
  }

  const goneQuiet = (clients ?? [])
    .filter(c => {
      const att = byPerson[c.id]
      return att && att.older > 0 && att.recent < 2
    })
    .sort((a, b) => (a.last_name ?? '').localeCompare(b.last_name ?? ''))
    .slice(0, 20)

  return NextResponse.json({ staleLeads, goneQuiet })
}

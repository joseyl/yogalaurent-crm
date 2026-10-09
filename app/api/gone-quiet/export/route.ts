import { NextRequest, NextResponse } from 'next/server'
import { getGoneQuiet, GROUPS, isGapGroup } from '@/lib/goneQuiet'
import { londonToday } from '@/lib/passRenewals'

export const dynamic = 'force-dynamic'

/**
 * CSV export of a Gone Quiet group for a Mailchimp segment (Build C). Behind the login.
 * Only the two longer groups (6 to 12 months, over 1 year): the shorter groups get
 * personal emails. Listed people only (dismissed left out; contacted kept, with the date).
 * ?group=6_to_12_months or over_1_year; &cameOnce=1 for Came once only.
 * The CRM sends nothing. The segment and any tag are built in the Mailchimp Expert project.
 */

function cell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export async function GET(request: NextRequest) {
  const group = request.nextUrl.searchParams.get('group')
  const cameOnce = request.nextUrl.searchParams.get('cameOnce') === '1'
  const g = GROUPS.find(x => x.key === group)
  if (!isGapGroup(group) || !g || !g.mailchimp) {
    return NextResponse.json({ error: 'Export is only for 6 to 12 months and over 1 year.' }, { status: 400 })
  }

  let rows
  try {
    rows = (await getGoneQuiet()).filter(r => r.listed && r.gap_group === group && (!cameOnce || r.came_once))
  } catch (e) {
    return NextResponse.json({ error: (e as { message?: string })?.message ?? 'Export failed' }, { status: 500 })
  }

  const header = ['Email', 'First Name', 'Last Name', 'Group', 'Came Once', 'Classes Attended', 'Last Activity', 'Contacted On']
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push(
      [r.email, r.first_name ?? '', r.last_name ?? '', g.label, r.came_once ? 'Yes' : 'No', String(r.classes_attended), r.last_activity, r.contacted_on ?? '']
        .map(cell)
        .join(','),
    )
  }
  const name = `gone-quiet-${group.replace(/_/g, '-')}${cameOnce ? '-came-once' : ''}-${londonToday()}.csv`
  return new NextResponse(lines.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  })
}

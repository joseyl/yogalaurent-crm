import PageHeader from '@/components/ui/PageHeader'
import GoneQuietList from '@/components/GoneQuietList'
import { getGoneQuiet, isGapGroup, type GoneQuietRow } from '@/lib/goneQuiet'
import { londonToday } from '@/lib/passRenewals'

export const dynamic = 'force-dynamic'

// Build C: the Gone Quiet page (data: view gone_quiet_people, migration 013).
// ?group=over_1_year | 6_to_12_months | 3_to_6_months | 1_to_3_months, ?view=dismissed, ?cameOnce=1
export default async function GoneQuietPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; view?: string; cameOnce?: string }>
}) {
  const sp = await searchParams
  let rows: GoneQuietRow[] = []
  let error: string | null = null
  try {
    rows = await getGoneQuiet()
  } catch (e) {
    error = (e as { message?: string })?.message ?? 'unknown error'
  }

  return (
    <div>
      <PageHeader
        title="Online Classes: Gone Quiet"
        subtitle="Last activity is the later of the last class attended and the last purchase. Longest gap first."
      />
      {error ? (
        <div className="card p-4 text-sm text-body">
          Gone Quiet unavailable: {error}
        </div>
      ) : (
        <GoneQuietList
          rows={rows}
          today={londonToday()}
          initialGroup={isGapGroup(sp.group) ? sp.group : 'over_1_year'}
          initialView={sp.view === 'dismissed' ? 'dismissed' : 'list'}
          initialCameOnce={sp.cameOnce === '1'}
        />
      )}
    </div>
  )
}

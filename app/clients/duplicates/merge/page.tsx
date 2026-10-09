import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import MergeForm from '@/components/MergeForm'
import { getPersonSummaries } from '@/lib/duplicates'

export const dynamic = 'force-dynamic'

// Build D, release 2: the merge screen for one pair (?a=<id>&b=<id>). Choose the record to
// keep and which value wins per field; the merge itself is the locked step merge_people.
export default async function MergePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>
}) {
  const sp = await searchParams
  const isId = (v?: string) => !!v && /^[0-9a-f-]{36}$/i.test(v)
  const ids = [sp.a, sp.b].filter(isId) as string[]
  const people = ids.length === 2 && ids[0] !== ids[1] ? await getPersonSummaries(ids) : new Map()
  const a = people.get(ids[0])
  const b = people.get(ids[1])

  return (
    <div>
      <Link href="/clients/duplicates" className="flex items-center gap-1 text-sm text-muted hover:text-heading w-fit mb-4">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Possible duplicates
      </Link>
      <PageHeader
        title="Merge two records"
        subtitle="Everything on the removed record moves to the kept record: purchases, classes, leads, payments, pass follow-ups and every other linked row. The merge can be undone from the Merges list."
      />
      {!a || !b ? (
        <div className="card p-4 text-sm text-body">
          One of these records no longer exists (merged or deleted). Go back to Possible duplicates and refresh.
        </div>
      ) : (
        <MergeForm a={a} b={b} />
      )}
    </div>
  )
}

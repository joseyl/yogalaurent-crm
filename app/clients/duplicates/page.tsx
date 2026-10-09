import PageHeader from '@/components/ui/PageHeader'
import Link from 'next/link'
import DuplicatesList from '@/components/DuplicatesList'
import { getMerges, getPairs, getPersonSummaries, sortPairs } from '@/lib/duplicates'
import type { MergeRow, PairRow, PersonSummary } from '@/lib/duplicatesShared'

export const dynamic = 'force-dynamic'

// Build D, release 2: Possible duplicates (data: view duplicate_pairs, migration 015).
// ?view=not_same | merges
export default async function DuplicatesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const sp = await searchParams
  let pairs: PairRow[] = []
  let merges: MergeRow[] = []
  let people = new Map<string, PersonSummary>()
  let error: string | null = null
  try {
    ;[pairs, merges] = await Promise.all([getPairs(), getMerges()])
    people = await getPersonSummaries(pairs.flatMap(p => [p.person_a, p.person_b]))
    pairs = sortPairs(pairs, people)
  } catch (e) {
    error = (e as { message?: string })?.message ?? 'unknown error'
  }

  return (
    <div>
      <Link href="/clients" className="flex items-center gap-1 text-sm text-muted hover:text-heading w-fit mb-4">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Clients
      </Link>
      <PageHeader
        title="Possible duplicates"
        subtitle="Pairs of records that may be the same person. Most likely first: same email, same phone, same full name, then nickname or one letter off."
      />
      {error ? (
        <div className="card p-4 text-sm text-body">Possible duplicates unavailable: {error}</div>
      ) : (
        <DuplicatesList
          pairs={pairs}
          people={Object.fromEntries(people)}
          merges={merges}
          initialView={sp.view === 'not_same' ? 'not_same' : sp.view === 'merges' ? 'merges' : 'pairs'}
        />
      )}
    </div>
  )
}

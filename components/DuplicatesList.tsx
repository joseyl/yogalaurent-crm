'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import { formatGBP } from '@/lib/utils'
import {
  countsText, personName, reasonLabels, shortDate,
  type MergeRow, type PairRow, type PersonSummary,
} from '@/lib/duplicatesShared'

// The Possible duplicates page (Build D, release 2). Three views: open pairs, pairs marked
// Not the same person (can be undone), and the merge log (each merge can be undone).

type View = 'pairs' | 'not_same' | 'merges'

const btn = 'text-xs min-h-[44px] md:min-h-0'
const fieldClass = 'border border-card-border px-2 text-sm min-h-[44px] md:min-h-[32px] bg-white w-full'

function PersonBox({ p, id }: { p: PersonSummary | undefined; id: string }) {
  if (!p) return <div className="text-sm text-muted">Record not found (merged or deleted). Refresh the page.</div>
  return (
    <div className="min-w-0 text-sm">
      <Link href={`/clients/${id}`} className="font-semibold text-heading hover:underline">{personName(p)}</Link>
      <div className="flex flex-wrap gap-1 mt-1">
        <Badge tone={p.status === 'deceased' ? 'red' : p.status === 'lead' ? 'amber' : p.status === 'inactive' ? 'grey' : 'green'}>
          {p.status}
        </Badge>
        {p.momence_member_id != null && <Badge tone="teal">Momence member</Badge>}
      </div>
      <p className="mt-1 break-all text-body">{p.email}</p>
      {p.alt_email && <p className="break-all text-muted">Alt: {p.alt_email}</p>}
      {p.other_emails.map(e => <p key={e} className="break-all text-muted">Other: {e}</p>)}
      {p.phone && <p className="text-muted">Phone: {p.phone}</p>}
      <p className="text-muted mt-1">
        {p.purchases} purchases ({formatGBP(p.spend)}), {p.classes} classes{p.leads ? `, ${p.leads} leads` : ''}
      </p>
      <p className="text-muted">Last activity: {shortDate(p.last_activity)}. Created {shortDate(p.created_at)}</p>
    </div>
  )
}

export default function DuplicatesList({
  pairs,
  people,
  merges,
  initialView,
}: {
  pairs: PairRow[]
  people: Record<string, PersonSummary>
  merges: MergeRow[]
  initialView: View
}) {
  const router = useRouter()
  const [view, setView] = useState<View>(initialView)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<{ key: string; text: string } | null>(null)
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [confirmUndo, setConfirmUndo] = useState<string | null>(null)

  const open = pairs.filter(p => !p.not_same)
  const notSame = pairs.filter(p => p.not_same)
  const key = (p: PairRow) => `${p.person_a}:${p.person_b}`

  async function post(url: string, body: unknown, k: string) {
    setBusy(k)
    setError(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setError({ key: k, text: data.error ?? 'Something went wrong.' })
        return false
      }
      router.refresh()
      return true
    } catch {
      setError({ key: k, text: 'Network error. Please try again.' })
      return false
    } finally {
      setBusy(null)
    }
  }

  const tabs: { v: View; label: string }[] = [
    { v: 'pairs', label: `Possible duplicates (${open.length})` },
    { v: 'not_same', label: `Not the same person (${notSame.length})` },
    { v: 'merges', label: `Merges (${merges.filter(m => m.status === 'merged').length})` },
  ]

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map(t => (
          <button
            key={t.v}
            onClick={() => { setView(t.v); setError(null) }}
            className={view === t.v ? 'btn-primary' : 'btn-secondary'}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view !== 'merges' && (
        <div className="grid gap-4">
          {(view === 'pairs' ? open : notSame).length === 0 && (
            <div className="card p-4 text-sm text-muted">
              {view === 'pairs' ? 'No possible duplicates.' : 'No pairs marked as not the same person.'}
            </div>
          )}
          {(view === 'pairs' ? open : notSame).map(p => {
            const k = key(p)
            return (
              <div key={k} className="card p-4">
                <div className="flex flex-wrap gap-1 mb-3">
                  {reasonLabels(p).map(r => <Badge key={r} tone="teal">{r}</Badge>)}
                  {p.more_than_one_intro_offer && <Badge tone="amber">{p.intro_offers} Intro Offers across both</Badge>}
                  {p.has_deceased && <Badge tone="red">Deceased record</Badge>}
                  {p.both_momence_numbers && <Badge tone="amber">Both have a Momence member number</Badge>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PersonBox p={people[p.person_a]} id={p.person_a} />
                  <PersonBox p={people[p.person_b]} id={p.person_b} />
                </div>

                {view === 'pairs' ? (
                  <div className="mt-4">
                    {noteFor === k ? (
                      <div className="grid gap-2">
                        <input
                          type="text"
                          value={note}
                          onChange={e => setNote(e.target.value)}
                          placeholder="note (optional), for example: mother and daughter"
                          className={fieldClass}
                        />
                        <div className="flex gap-2">
                          <button
                            className={`btn-primary ${btn}`}
                            disabled={busy === k}
                            onClick={async () => {
                              if (await post('/api/duplicates/pair', { action: 'not_same', a: p.person_a, b: p.person_b, note }, k)) {
                                setNoteFor(null)
                                setNote('')
                              }
                            }}
                          >
                            {busy === k ? 'Saving...' : 'Confirm: not the same person'}
                          </button>
                          <button className={`btn-secondary ${btn}`} onClick={() => setNoteFor(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/clients/duplicates/merge?a=${p.person_a}&b=${p.person_b}`} className={`btn-primary ${btn}`}>
                          Merge...
                        </Link>
                        <button className={`btn-secondary ${btn}`} onClick={() => { setNoteFor(k); setNote(''); setError(null) }}>
                          Not the same person
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <p className="text-xs text-muted">
                      Marked {shortDate(p.not_same_at)}{p.not_same_note ? `: ${p.not_same_note}` : ''}
                    </p>
                    <button
                      className={`btn-secondary ${btn}`}
                      disabled={busy === k}
                      onClick={() => post('/api/duplicates/pair', { action: 'undo_not_same', a: p.person_a, b: p.person_b }, k)}
                    >
                      {busy === k ? 'Saving...' : 'Undo: show this pair again'}
                    </button>
                  </div>
                )}
                {error?.key === k && <p className="text-red-500 text-sm mt-2">{error.text}</p>}
              </div>
            )
          })}
        </div>
      )}

      {view === 'merges' && (
        <div className="grid gap-4">
          {merges.length === 0 && <div className="card p-4 text-sm text-muted">No merges yet.</div>}
          {merges.map(m => (
            <div key={m.id} className={`card p-4 text-sm ${m.status === 'undone' ? 'opacity-60' : ''}`}>
              <p className="text-heading">
                <span className="font-semibold">{m.removed_name}</span> ({m.removed_email}) merged into{' '}
                {m.kept_exists ? (
                  <Link href={`/clients/${m.kept_id}`} className="font-semibold hover:underline">{m.kept_name}</Link>
                ) : (
                  <span className="font-semibold">a record that has since been merged again</span>
                )}
              </p>
              <p className="text-muted mt-1">
                {shortDate(m.merged_at)}. Moved: {countsText(m.row_counts, m.gone_quiet_rule)}.
                {m.emails_added.length > 0 && ` Emails added: ${m.emails_added.join(', ')}.`}
                {m.emails_skipped.length > 0 && ` Not added (on another record): ${m.emails_skipped.join(', ')}.`}
                {m.note && ` Note: ${m.note}`}
              </p>
              {m.status === 'undone' ? (
                <p className="text-muted mt-1">Undone {shortDate(m.undone_at)}.</p>
              ) : confirmUndo === m.id ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className={`btn-primary ${btn}`}
                    disabled={busy === m.id}
                    onClick={async () => {
                      if (await post('/api/duplicates/undo', { mergeId: m.id }, m.id)) setConfirmUndo(null)
                    }}
                  >
                    {busy === m.id ? 'Undoing...' : 'Confirm undo: bring back the removed record'}
                  </button>
                  <button className={`btn-secondary ${btn}`} onClick={() => setConfirmUndo(null)}>Cancel</button>
                </div>
              ) : (
                <button className={`btn-secondary ${btn} mt-3`} onClick={() => { setConfirmUndo(m.id); setError(null) }}>
                  Undo merge
                </button>
              )}
              {error?.key === m.id && <p className="text-red-500 text-sm mt-2">{error.text}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

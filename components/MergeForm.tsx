'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { formatGBP } from '@/lib/utils'
import { countsText, personName, shortDate, type PersonSummary } from '@/lib/duplicatesShared'

// Merge screen (Build D, release 2). Pick the record to keep, then which value wins per field.
// Email, alt email, assigned to, source channel and created date are always the kept record's;
// the removed record's emails become other emails of the kept record.

type Side = 'a' | 'b'
type Field = 'first_name' | 'last_name' | 'phone' | 'country'
const FIELDS: { f: Field; label: string }[] = [
  { f: 'first_name', label: 'First name' },
  { f: 'last_name', label: 'Last name' },
  { f: 'phone', label: 'Phone' },
  { f: 'country', label: 'Country' },
]

interface MergeResult {
  merge_id: string
  kept_id: string
  counts: Record<string, number>
  emails_added: string[]
  emails_skipped: string[]
  gone_quiet_rule: string
}

function history(p: PersonSummary) {
  return p.purchases + p.classes + p.leads
}

export default function MergeForm({ a, b }: { a: PersonSummary; b: PersonSummary }) {
  // Default: keep the record with more history; on a tie, the older one
  const defaultKeep: Side = useMemo(() => {
    if (history(a) !== history(b)) return history(a) > history(b) ? 'a' : 'b'
    return (a.created_at ?? '') <= (b.created_at ?? '') ? 'a' : 'b'
  }, [a, b])

  const [keep, setKeep] = useState<Side>(defaultKeep)
  const kept = keep === 'a' ? a : b
  const removed = keep === 'a' ? b : a

  // Per field: which record's value wins. Default: the kept record's, unless it is blank.
  const defaults = (k: Side) => {
    const kp = k === 'a' ? a : b
    const rp = k === 'a' ? b : a
    const out = {} as Record<Field, Side>
    for (const { f } of FIELDS) out[f] = !kp[f] && rp[f] ? (k === 'a' ? 'b' : 'a') : k
    return out
  }
  const [pick, setPick] = useState<Record<Field, Side>>(() => defaults(defaultKeep))
  const notesDefault = (k: Side): 'keep' | 'remove' | 'both' => {
    const kp = k === 'a' ? a : b
    const rp = k === 'a' ? b : a
    if (kp.notes?.trim() && rp.notes?.trim()) return 'both'
    return !kp.notes?.trim() && rp.notes?.trim() ? 'remove' : 'keep'
  }
  const [notes, setNotes] = useState<'keep' | 'remove' | 'both'>(() => notesDefault(defaultKeep))
  const [note, setNote] = useState('')
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MergeResult | null>(null)
  const [undone, setUndone] = useState(false)

  function changeKeep(k: Side) {
    setKeep(k)
    setPick(defaults(k))
    setNotes(notesDefault(k))
    setChecked(false)
  }

  async function merge() {
    setBusy(true)
    setError(null)
    const choices: Record<string, string> = { notes }
    for (const { f } of FIELDS) choices[f] = pick[f] === keep ? 'keep' : 'remove'
    try {
      const res = await fetch('/api/duplicates/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keep: kept.id, remove: removed.id, choices, note }),
      })
      const data = await res.json() as MergeResult & { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'The merge did not run. Nothing changed.')
        return
      }
      setResult(data)
    } catch {
      setError('Network error. Check the Merges list before trying again.')
    } finally {
      setBusy(false)
    }
  }

  async function undo() {
    if (!result) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/duplicates/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mergeId: result.merge_id }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'The undo did not run. Nothing changed.')
        return
      }
      setUndone(true)
    } catch {
      setError('Network error. Check the Merges list.')
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    return (
      <div className="card p-4 text-sm">
        {undone ? (
          <>
            <p className="font-semibold text-heading">Merge undone. Both records are back as they were.</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Link href={`/clients/${a.id}`} className="btn-secondary">Open {personName(a)}</Link>
              <Link href={`/clients/${b.id}`} className="btn-secondary">Open {personName(b)}</Link>
              <Link href="/clients/duplicates" className="btn-secondary">Back to Possible duplicates</Link>
            </div>
          </>
        ) : (
          <>
            <p className="font-semibold text-heading">Merged into {personName(kept)}.</p>
            <p className="text-body mt-1">Moved: {countsText(result.counts, result.gone_quiet_rule)}.</p>
            {result.emails_added.length > 0 && (
              <p className="text-body">Other emails added: {result.emails_added.join(', ')}.</p>
            )}
            {result.emails_skipped.length > 0 && (
              <p className="text-amber-vivid">
                Not added, because they are on a third record: {result.emails_skipped.join(', ')}. Check Possible duplicates.
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <Link href={`/clients/${result.kept_id}`} className="btn-primary">Open {personName(kept)}</Link>
              <Link href="/clients/duplicates" className="btn-secondary">Back to Possible duplicates</Link>
              <button onClick={undo} disabled={busy} className="btn-secondary">
                {busy ? 'Undoing...' : 'Undo this merge'}
              </button>
            </div>
          </>
        )}
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    )
  }

  const valueOf = (p: PersonSummary, f: Field) => p[f] || '(blank)'
  const radio = 'mt-1 shrink-0'

  return (
    <div className="grid gap-4">
      <div className="card p-4">
        <p className="text-sm font-semibold text-heading mb-2">1. Which record to keep?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(['a', 'b'] as Side[]).map(s => {
            const p = s === 'a' ? a : b
            return (
              <label key={s} className={`flex gap-2 p-3 border text-sm cursor-pointer ${keep === s ? 'border-accent' : 'border-card-border'}`}>
                <input type="radio" name="keep" checked={keep === s} onChange={() => changeKeep(s)} className={radio} />
                <span className="min-w-0">
                  <span className="font-semibold text-heading">{personName(p)}</span>{' '}
                  <Badge tone={p.status === 'deceased' ? 'red' : p.status === 'lead' ? 'amber' : 'green'}>{p.status}</Badge>
                  <span className="block break-all text-body">{p.email}</span>
                  {p.alt_email && <span className="block break-all text-muted">Alt: {p.alt_email}</span>}
                  {p.other_emails.map(e => <span key={e} className="block break-all text-muted">Other: {e}</span>)}
                  <span className="block text-muted">
                    {p.purchases} purchases ({formatGBP(p.spend)}), {p.classes} classes, {p.leads} leads
                    {p.intro_offers > 0 ? `, ${p.intro_offers} Intro Offer${p.intro_offers > 1 ? 's' : ''}` : ''}
                  </span>
                  <span className="block text-muted">
                    Last activity {shortDate(p.last_activity)}. Created {shortDate(p.created_at)}
                    {p.momence_member_id != null ? '. Has a Momence member number' : ''}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
        <p className="text-xs text-muted mt-2">
          Kept: {personName(kept)} ({kept.email}). Removed: {personName(removed)} ({removed.email}), whose
          email{removed.alt_email ? ' and alt email' : ''} become other emails of the kept record.
          {a.momence_member_id != null && b.momence_member_id != null && ' Both have a Momence member number: the kept record keeps its own; the other is kept in the merge log.'}
          {(a.status === 'deceased' || b.status === 'deceased') && ' One record is marked deceased: check before merging.'}
        </p>
      </div>

      <div className="card p-4">
        <p className="text-sm font-semibold text-heading mb-2">2. Which value wins?</p>
        <div className="grid gap-3">
          {FIELDS.map(({ f, label }) => (
            <div key={f}>
              <p className="uppercase tracking-wide text-xs text-muted mb-1">{label}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(['a', 'b'] as Side[]).map(s => (
                  <label key={s} className="flex gap-2 text-sm cursor-pointer">
                    <input type="radio" name={f} checked={pick[f] === s} onChange={() => setPick(x => ({ ...x, [f]: s }))} className={radio} />
                    <span className="break-all">{valueOf(s === 'a' ? a : b, f)}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div>
            <p className="uppercase tracking-wide text-xs text-muted mb-1">Notes</p>
            <div className="grid gap-2 text-sm">
              <label className="flex gap-2 cursor-pointer">
                <input type="radio" name="notes" checked={notes === 'keep'} onChange={() => setNotes('keep')} className={radio} />
                <span>Kept record&apos;s notes: {kept.notes?.trim() || '(blank)'}</span>
              </label>
              <label className="flex gap-2 cursor-pointer">
                <input type="radio" name="notes" checked={notes === 'remove'} onChange={() => setNotes('remove')} className={radio} />
                <span>Removed record&apos;s notes: {removed.notes?.trim() || '(blank)'}</span>
              </label>
              <label className="flex gap-2 cursor-pointer">
                <input type="radio" name="notes" checked={notes === 'both'} onChange={() => setNotes('both')} className={radio} />
                <span>Keep both</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4 grid gap-3">
        <p className="text-sm font-semibold text-heading">3. Merge</p>
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="note for the merge log (optional), for example: old Acuity email"
          className="border border-card-border px-3 py-2 text-sm w-full"
          style={{ minHeight: 44 }}
        />
        <label className="flex gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className={radio} />
          <span>I have checked these two records are the same person.</span>
        </label>
        <div>
          <button onClick={merge} disabled={!checked || busy} className="btn-primary">
            {busy ? 'Merging...' : `Merge into ${personName(kept)}`}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    </div>
  )
}

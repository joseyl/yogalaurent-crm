'use client'

import { useState } from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'

// Client page: other emails of this client (Build D, table person_emails, migration 014).
// Every lookup by email (Stripe, Momence, website, forms) also checks these, so an old or
// second address finds this client instead of creating a new one.

export interface OtherEmailRow {
  id: string
  email: string
  source: 'hand' | 'merge'
  note: string | null
  created_at: string
}

export default function OtherEmails({ personId, initial }: { personId: string; initial: OtherEmailRow[] }) {
  const [rows, setRows] = useState<OtherEmailRow[]>(initial)
  const [adding, setAdding] = useState(false)
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otherId, setOtherId] = useState<string | null>(null)

  async function add() {
    setBusy(true)
    setError(null)
    setOtherId(null)
    try {
      const res = await fetch(`/api/people/${personId}/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, note }),
      })
      const data = await res.json() as { error?: string; id?: string; email?: string; otherPersonId?: string | null }
      if (!res.ok || !data.id || !data.email) {
        setError(data.error ?? 'Could not add the email.')
        setOtherId(data.otherPersonId ?? null)
        return
      }
      setRows(r => [...r, {
        id: data.id!, email: data.email!, source: 'hand', note: note.trim() || null, created_at: new Date().toISOString(),
      }])
      setEmail('')
      setNote('')
      setAdding(false)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(row: OtherEmailRow) {
    if (busy) return
    setBusy(true)
    setError(null)
    setOtherId(null)
    try {
      const res = await fetch(`/api/people/${personId}/emails`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId: row.id }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok && res.status !== 404) {
        setError(data.error ?? 'Could not remove the email.')
        return
      }
      setRows(r => r.filter(x => x.id !== row.id))
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="uppercase tracking-wide text-xs text-muted">Other emails</p>
        {!adding && (
          <button onClick={() => { setAdding(true); setError(null); setOtherId(null) }} className="btn-secondary">
            Add email
          </button>
        )}
      </div>

      {rows.length === 0 && !adding && (
        <p className="text-sm text-muted">None. Old or second addresses added here are found by every feed.</p>
      )}

      {rows.length > 0 && (
        <ul className="divide-y divide-card-border">
          {rows.map(r => (
            <li key={r.id} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-heading break-all">{r.email}</p>
                <p className="text-xs text-muted">
                  {r.source === 'merge' ? 'From a merged record' : 'Added by hand'}
                  {r.note ? `. ${r.note}` : ''}
                </p>
              </div>
              <button onClick={() => remove(r)} disabled={busy} className="text-xs text-muted hover:text-heading shrink-0 py-1">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <div className="mt-3 grid gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email address"
            className="w-full border border-card-border px-3 py-2 text-sm"
            style={{ minHeight: 44 }}
          />
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="note (optional), for example: used at Momence"
            className="w-full border border-card-border px-3 py-2 text-sm"
            style={{ minHeight: 44 }}
          />
          <div className="flex gap-3">
            <button onClick={add} disabled={busy || !email.trim()} className="btn-primary">
              {busy ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => { setAdding(false); setError(null); setOtherId(null) }} disabled={busy} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm mt-2">
          {error}
          {otherId && (
            <>
              {' '}
              <Link href={`/clients/${otherId}`} className="underline">Open that record</Link>
            </>
          )}
        </p>
      )}
    </Card>
  )
}

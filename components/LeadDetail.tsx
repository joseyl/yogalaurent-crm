'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'

interface LeadData {
  id: string
  status: string
  assigned_to: string
  date_added: string
  last_followup_date: string | null
  notes: string | null
  person_id: string
  product_id: string | null
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  country: string | null
  source_channel: string | null
  product_name: string | null
}

interface Props {
  lead: LeadData
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function daysSince(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = Date.UTC(y, m - 1, d)
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.floor((today - date) / (1000 * 60 * 60 * 24))
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function Field({ label, value, stale }: { label: string; value: string | null | undefined; stale?: boolean }) {
  const display = value || '—'
  return (
    <div>
      <p className="uppercase tracking-wide text-xs mb-1 text-muted">{label}</p>
      <p className={`text-sm ${stale ? 'font-bold text-red-vivid' : 'font-medium text-heading'}`}>
        {display}
      </p>
    </div>
  )
}

function SaveMsg({ state }: { state: SaveState }) {
  if (state === 'saved') return <span className="text-green-600 text-xs ml-2">Saved</span>
  if (state === 'error') return <span className="text-red-500 text-xs ml-2">Failed to save</span>
  return null
}

export default function LeadDetail({ lead: initialLead }: Props) {
  const router = useRouter()
  const [lead, setLead] = useState(initialLead)
  const [notes, setNotes] = useState(initialLead.notes ?? '')

  const [statusState, setStatusState] = useState<SaveState>('idle')
  const [assignedState, setAssignedState] = useState<SaveState>('idle')
  const [notesState, setNotesState] = useState<SaveState>('idle')
  const [converting, setConverting] = useState(false)

  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const assignedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const referenceDate = (lead.last_followup_date ?? lead.date_added) as string
  const days = daysSince(referenceDate)

  async function patch(payload: Record<string, string>) {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Failed to save')
  }

  function flash(setState: (s: SaveState) => void, timer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>, state: SaveState) {
    if (timer.current) clearTimeout(timer.current)
    setState(state)
    if (state === 'saved') {
      timer.current = setTimeout(() => setState('idle'), 2000)
    }
  }

  async function handleStatusChange(value: string) {
    setStatusState('saving')
    try {
      await patch({ status: value })
      setLead(prev => ({ ...prev, status: value }))
      flash(setStatusState, statusTimer, 'saved')
    } catch {
      flash(setStatusState, statusTimer, 'error')
    }
  }

  async function handleAssignedChange(value: string) {
    setAssignedState('saving')
    try {
      await patch({ assigned_to: value })
      setLead(prev => ({ ...prev, assigned_to: value }))
      flash(setAssignedState, assignedTimer, 'saved')
    } catch {
      flash(setAssignedState, assignedTimer, 'error')
    }
  }

  async function handleSaveNotes() {
    setNotesState('saving')
    try {
      await patch({ notes, last_followup_date: todayISO() })
      setLead(prev => ({ ...prev, notes, last_followup_date: todayISO() }))
      flash(setNotesState, notesTimer, 'saved')
    } catch {
      flash(setNotesState, notesTimer, 'error')
    }
  }

  async function handleConvert() {
    const confirmed = window.confirm(
      'Mark this lead as converted? This will update their status to Converted. You can then add a purchase from their client profile.'
    )
    if (!confirmed) return
    setConverting(true)
    try {
      await patch({ status: 'converted' })
      router.push(`/clients/${lead.person_id}`)
    } catch {
      setConverting(false)
      alert('Failed to convert lead. Please try again.')
    }
  }

  const selectStyle: React.CSSProperties = {
    border: '1px solid #E4E7EC',
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '10px',
    fontSize: '14px',
    borderRadius: '8px',
    minHeight: '44px',
    width: '100%',
  }

  const showConvert = lead.status !== 'converted' && lead.status !== 'dead'

  return (
    <div>
      {/* Back link */}
      <Link href="/leads" className="flex items-center gap-1 text-sm text-muted hover:text-heading w-fit mb-4">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to Leads
      </Link>

      <PageHeader
        title={`${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() || '—'}
        badge={<StatusBadge status={lead.status} type="lead" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: contact details */}
        <Card title="Contact &amp; Details">
          <div className="grid grid-cols-1 gap-4">
            <Field label="Email" value={lead.email} />
            <Field label="Phone" value={lead.phone} />
            <Field label="Country" value={lead.country} />
            <Field label="Source Channel" value={lead.source_channel} />
            <Field label="Assigned To" value={lead.assigned_to} />
            <Field label="Product of Interest" value={lead.product_name} />
            <Field label="Date Added" value={lead.date_added} />
            <Field
              label="Days Since Follow-up"
              value={`${days} days`}
              stale={days >= 7}
            />
          </div>
        </Card>

        {/* Right: actions */}
        <Card title="Actions">
          <div className="flex flex-col gap-5">
            {/* Status */}
            <div>
              <p className="uppercase tracking-wide text-xs mb-2 text-muted">Status</p>
              <div className="flex items-center gap-2">
                <select
                  value={lead.status}
                  onChange={e => handleStatusChange(e.target.value)}
                  style={selectStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E4E7EC' }}
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="quoted">Quoted</option>
                  <option value="converted">Converted</option>
                  <option value="dead">Dead</option>
                </select>
                <SaveMsg state={statusState} />
              </div>
            </div>

            {/* Assigned to */}
            <div>
              <p className="uppercase tracking-wide text-xs mb-2 text-muted">Assigned To</p>
              <div className="flex items-center gap-2">
                <select
                  value={lead.assigned_to}
                  onChange={e => handleAssignedChange(e.target.value)}
                  style={selectStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E4E7EC' }}
                >
                  <option value="Jose">Jose</option>
                  <option value="Laurent">Laurent</option>
                </select>
                <SaveMsg state={assignedState} />
              </div>
            </div>

            {/* Notes */}
            <div>
              <p className="font-semibold text-sm text-heading mb-2">Notes</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={5}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  border: '1px solid #E4E7EC',
                  padding: '10px 12px',
                  fontSize: '14px',
                  borderRadius: '8px',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
                onBlur={e => { e.target.style.borderColor = '#E4E7EC' }}
              />
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={handleSaveNotes}
                  disabled={notesState === 'saving'}
                  className="btn-primary"
                >
                  {notesState === 'saving' ? 'Saving...' : 'Save Notes'}
                </button>
                <SaveMsg state={notesState} />
              </div>
            </div>

            {/* Convert */}
            {showConvert && (
              <div className="pt-2 border-t border-card-border">
                <button onClick={handleConvert} disabled={converting} className="btn-primary w-full">
                  {converting ? 'Converting...' : 'Convert to Client'}
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

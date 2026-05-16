'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'

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
      <p className="uppercase tracking-wide text-xs mb-1" style={{ color: '#6b7280' }}>{label}</p>
      <p
        className="font-medium text-sm"
        style={{ color: stale ? '#dc2626' : '#1A2C4E', fontWeight: stale ? 700 : 500 }}
      >
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
    border: '1px solid #d1d5db',
    padding: '8px 10px',
    fontSize: '14px',
    borderRadius: 0,
    background: 'white',
    minHeight: '40px',
  }

  const showConvert = lead.status !== 'converted' && lead.status !== 'dead'

  return (
    <div className="pb-24 max-w-4xl">
      {/* Back link */}
      <div className="px-6 pt-5 pb-2">
        <Link href="/leads" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 w-fit">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Leads
        </Link>
      </div>

      {/* Header */}
      <div className="px-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:gap-3 gap-2">
          <h1 className="font-bold" style={{ fontSize: '22px', color: '#1A2C4E' }}>
            {lead.first_name} {lead.last_name}
          </h1>
          <StatusBadge status={lead.status} type="lead" />
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 mt-4">
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
      </div>

      {/* Action bar */}
      <div
        className="px-6 grid grid-cols-1 md:grid-cols-3 gap-4"
        style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '0' }}
      >
        {/* Status */}
        <div>
          <p className="uppercase tracking-wide text-xs mb-2" style={{ color: '#6b7280' }}>Status</p>
          <div className="flex items-center gap-2">
            <select
              value={lead.status}
              onChange={e => handleStatusChange(e.target.value)}
              style={selectStyle}
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
          <p className="uppercase tracking-wide text-xs mb-2" style={{ color: '#6b7280' }}>Assigned To</p>
          <div className="flex items-center gap-2">
            <select
              value={lead.assigned_to}
              onChange={e => handleAssignedChange(e.target.value)}
              style={selectStyle}
            >
              <option value="Jose">Jose</option>
              <option value="Laurent">Laurent</option>
            </select>
            <SaveMsg state={assignedState} />
          </div>
        </div>

        {/* Convert */}
        {showConvert && (
          <div>
            <p className="uppercase tracking-wide text-xs mb-2" style={{ color: '#6b7280' }}>Actions</p>
            <button
              onClick={handleConvert}
              disabled={converting}
              className="font-semibold text-white"
              style={{
                background: converting ? '#9ca3af' : '#B8540A',
                padding: '10px 20px',
                borderRadius: 0,
                border: 'none',
                cursor: converting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              {converting ? 'Converting...' : 'Convert to Client'}
            </button>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="px-6 mt-6">
        <p className="font-semibold mb-2" style={{ color: '#1A2C4E' }}>Notes</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={5}
          style={{
            width: '100%',
            minHeight: '120px',
            border: '1px solid #d1d5db',
            padding: '10px 12px',
            fontSize: '16px',
            borderRadius: 0,
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={e => { e.target.style.borderColor = '#1A2C4E' }}
          onBlur={e => { e.target.style.borderColor = '#d1d5db' }}
        />
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={handleSaveNotes}
            disabled={notesState === 'saving'}
            className="font-semibold text-white"
            style={{
              background: notesState === 'saving' ? '#9ca3af' : '#1A2C4E',
              padding: '10px 20px',
              borderRadius: 0,
              border: 'none',
              cursor: notesState === 'saving' ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            {notesState === 'saving' ? 'Saving...' : 'Save Notes'}
          </button>
          <SaveMsg state={notesState} />
        </div>
      </div>
    </div>
  )
}

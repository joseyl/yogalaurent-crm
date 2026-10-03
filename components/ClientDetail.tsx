'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Edit2 } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import ClientTabs from '@/components/ClientTabs'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'

interface PersonData {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  alt_email: string | null
  phone: string | null
  country: string | null
  status: string
  assigned_to: string | null
  source_channel: string | null
  notes: string | null
}

interface Purchase {
  id: string
  product_id: string
  amount_gbp: number
  purchase_date: string
  notes: string | null
  product_name: string
  category: string
  edition: string | null
  cohort_year: number | null
}

interface Attendance {
  id: string
  class_name: string
  class_date: string
  pass_used: string | null
}

interface LeadRecord {
  id: string
  status: string
  date_added: string
  last_followup_date: string | null
  notes: string | null
  assigned_to: string
  product_name: string | null
}

interface Product {
  id: string
  name: string
  category: string
  entity: string
}

interface Props {
  person: PersonData
  purchases: Purchase[]
  attendance: Attendance[]
  leads: LeadRecord[]
  products: Product[]
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '44px',
  border: '1px solid #E4E7EC',
  padding: '10px 12px',
  fontSize: '14px',
  borderRadius: '8px',
  outline: 'none',
  boxSizing: 'border-box',
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="uppercase tracking-wide text-xs mb-1 text-muted">{label}</p>
      <p className="font-medium text-sm text-heading">{value || '—'}</p>
    </div>
  )
}

export default function ClientDetail({ person: initialPerson, purchases, attendance, leads, products }: Props) {
  const [person, setPerson] = useState<PersonData>(initialPerson)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<PersonData>(initialPerson)
  const [saving, setSaving] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  function startEdit() {
    setForm(person)
    setEmailError(null)
    setApiError(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setEmailError(null)
    setApiError(null)
  }

  function setField(field: keyof PersonData, value: string) {
    setForm(prev => ({ ...prev, [field]: value || null }))
  }

  function setEmailField(value: string) {
    setForm(prev => ({ ...prev, email: value }))
  }

  async function handleSave() {
    if (!form.email?.trim()) {
      setEmailError('Email is required.')
      return
    }
    setEmailError(null)
    setApiError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/people/${person.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name || null,
          last_name: form.last_name || null,
          email: form.email.trim(),
          alt_email: form.alt_email || null,
          phone: form.phone || null,
          country: form.country || null,
          status: form.status,
          assigned_to: form.assigned_to || null,
          source_channel: form.source_channel || null,
          notes: form.notes || null,
        }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setApiError(data.error ?? 'Failed to save.')
        setSaving(false)
        return
      }
      setPerson({ ...form })
      setEditing(false)
    } catch {
      setApiError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.target.style.borderColor = 'var(--accent)'
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.target.style.borderColor = '#E4E7EC'
  }

  return (
    <div>
      <Link
        href="/clients"
        className="flex items-center gap-1 text-sm text-muted hover:text-heading w-fit mb-4"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to Clients
      </Link>

      {editing ? (
        <div className="card p-5 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block uppercase tracking-wide text-xs mb-1 text-muted">First Name</label>
              <input
                type="text"
                value={form.first_name ?? ''}
                onChange={e => setField('first_name', e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block uppercase tracking-wide text-xs mb-1 text-muted">Last Name</label>
              <input
                type="text"
                value={form.last_name ?? ''}
                onChange={e => setField('last_name', e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block uppercase tracking-wide text-xs mb-1 text-muted">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email ?? ''}
                onChange={e => setEmailField(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                style={{ ...inputStyle, borderColor: emailError ? '#ef4444' : '#E4E7EC' }}
              />
              {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
            </div>
            <div>
              <label className="block uppercase tracking-wide text-xs mb-1 text-muted">Alt Email</label>
              <input
                type="email"
                value={form.alt_email ?? ''}
                onChange={e => setField('alt_email', e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block uppercase tracking-wide text-xs mb-1 text-muted">Phone</label>
              <input
                type="tel"
                value={form.phone ?? ''}
                onChange={e => setField('phone', e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block uppercase tracking-wide text-xs mb-1 text-muted">Country</label>
              <input
                type="text"
                value={form.country ?? ''}
                onChange={e => setField('country', e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block uppercase tracking-wide text-xs mb-1 text-muted">Status</label>
              <select
                value={form.status ?? 'client'}
                onChange={e => setField('status', e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                style={{ ...inputStyle, paddingRight: '2.5rem' }}
              >
                <option value="client">client</option>
                <option value="lead">lead</option>
                <option value="inactive">inactive</option>
                <option value="deceased">deceased</option>
              </select>
            </div>
            <div>
              <label className="block uppercase tracking-wide text-xs mb-1 text-muted">Assigned To</label>
              <select
                value={form.assigned_to ?? 'Jose'}
                onChange={e => setField('assigned_to', e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                style={{ ...inputStyle, paddingRight: '2.5rem' }}
              >
                <option value="Jose">Jose</option>
                <option value="Laurent">Laurent</option>
              </select>
            </div>
            <div>
              <label className="block uppercase tracking-wide text-xs mb-1 text-muted">Source Channel</label>
              <input
                type="text"
                value={form.source_channel ?? ''}
                onChange={e => setField('source_channel', e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                style={inputStyle}
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="block uppercase tracking-wide text-xs mb-1 text-muted">Notes</label>
            <textarea
              rows={3}
              value={form.notes ?? ''}
              onChange={e => setField('notes', e.target.value)}
              onFocus={onFocus}
              onBlur={onBlur}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          {apiError && <p className="text-red-500 text-sm mb-3">{apiError}</p>}
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={cancelEdit} disabled={saving} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <PageHeader
            title={[person.first_name, person.last_name].filter(Boolean).join(' ') || '—'}
            badge={<StatusBadge status={person.status} />}
            actions={
              <button onClick={startEdit} className="btn-secondary">
                <Edit2 size={13} />
                Edit
              </button>
            }
          />

          <Card className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 mb-4">
              <Field label="Email" value={person.email} />
              <Field label="Alt Email" value={person.alt_email} />
              <Field label="Phone" value={person.phone} />
              <Field label="Country" value={person.country} />
              <Field label="Assigned To" value={person.assigned_to} />
              <Field label="Source Channel" value={person.source_channel} />
            </div>
            <div className="pt-4 border-t border-card-border">
              <p className="uppercase tracking-wide text-xs mb-1 text-muted">Notes</p>
              <p className="text-sm text-body">{person.notes || '—'}</p>
            </div>
          </Card>
        </>
      )}

      <div className="border-t border-card-border" />

      <div className="mt-2">
        <ClientTabs
          personId={person.id}
          purchases={purchases}
          attendance={attendance}
          leads={leads}
          products={products}
        />
      </div>
    </div>
  )
}

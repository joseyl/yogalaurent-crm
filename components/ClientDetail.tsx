'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Edit2 } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import ClientTabs from '@/components/ClientTabs'

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
  border: '1px solid #d1d5db',
  padding: '10px 12px',
  fontSize: '14px',
  borderRadius: 0,
  outline: 'none',
  boxSizing: 'border-box',
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="uppercase tracking-wide text-xs mb-1" style={{ color: '#6b7280' }}>{label}</p>
      <p className="font-medium text-sm" style={{ color: '#1A2C4E' }}>{value || '—'}</p>
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
    e.target.style.borderColor = '#1A2C4E'
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.target.style.borderColor = '#d1d5db'
  }

  return (
    <div className="pb-24 max-w-4xl">
      <div className="px-6 pt-5 pb-2">
        <Link
          href="/clients"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 w-fit"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Clients
        </Link>
      </div>

      <div className="px-6 pb-4">
        {editing ? (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block uppercase tracking-wide text-xs mb-1" style={{ color: '#6b7280' }}>First Name</label>
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
                <label className="block uppercase tracking-wide text-xs mb-1" style={{ color: '#6b7280' }}>Last Name</label>
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
                <label className="block uppercase tracking-wide text-xs mb-1" style={{ color: '#6b7280' }}>
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email ?? ''}
                  onChange={e => setEmailField(e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={{ ...inputStyle, borderColor: emailError ? '#ef4444' : '#d1d5db' }}
                />
                {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
              </div>
              <div>
                <label className="block uppercase tracking-wide text-xs mb-1" style={{ color: '#6b7280' }}>Alt Email</label>
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
                <label className="block uppercase tracking-wide text-xs mb-1" style={{ color: '#6b7280' }}>Phone</label>
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
                <label className="block uppercase tracking-wide text-xs mb-1" style={{ color: '#6b7280' }}>Country</label>
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
                <label className="block uppercase tracking-wide text-xs mb-1" style={{ color: '#6b7280' }}>Status</label>
                <select
                  value={form.status ?? 'client'}
                  onChange={e => setField('status', e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={inputStyle}
                >
                  <option value="client">client</option>
                  <option value="lead">lead</option>
                  <option value="inactive">inactive</option>
                  <option value="deceased">deceased</option>
                </select>
              </div>
              <div>
                <label className="block uppercase tracking-wide text-xs mb-1" style={{ color: '#6b7280' }}>Assigned To</label>
                <select
                  value={form.assigned_to ?? 'Jose'}
                  onChange={e => setField('assigned_to', e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={inputStyle}
                >
                  <option value="Jose">Jose</option>
                  <option value="Laurent">Laurent</option>
                </select>
              </div>
              <div>
                <label className="block uppercase tracking-wide text-xs mb-1" style={{ color: '#6b7280' }}>Source Channel</label>
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
              <label className="block uppercase tracking-wide text-xs mb-1" style={{ color: '#6b7280' }}>Notes</label>
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
              <button
                onClick={handleSave}
                disabled={saving}
                className="font-semibold text-white text-sm"
                style={{
                  background: saving ? '#9ca3af' : '#1A2C4E',
                  padding: '10px 20px',
                  minHeight: '44px',
                  borderRadius: 0,
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="font-medium text-sm"
                style={{
                  background: 'none',
                  border: '1px solid #d1d5db',
                  padding: '10px 20px',
                  minHeight: '44px',
                  borderRadius: 0,
                  cursor: 'pointer',
                  color: '#374151',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h1 className="font-bold" style={{ fontSize: '22px', color: '#1A2C4E' }}>
                {person.first_name} {person.last_name}
              </h1>
              <StatusBadge status={person.status} />
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 text-sm"
                style={{
                  background: 'none',
                  border: '1px solid #d1d5db',
                  padding: '6px 12px',
                  borderRadius: 0,
                  cursor: 'pointer',
                  color: '#374151',
                  minHeight: '32px',
                }}
              >
                <Edit2 size={13} />
                Edit
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Email" value={person.email} />
              <Field label="Alt Email" value={person.alt_email} />
              <Field label="Phone" value={person.phone} />
              <Field label="Country" value={person.country} />
              <Field label="Assigned To" value={person.assigned_to} />
              <Field label="Source Channel" value={person.source_channel} />
            </div>

            <div className="mt-4">
              <p className="uppercase tracking-wide text-xs mb-1" style={{ color: '#6b7280' }}>Notes</p>
              <p className="text-sm" style={{ color: '#374151' }}>{person.notes || '—'}</p>
            </div>
          </>
        )}
      </div>

      <div className="border-t border-[#e5e7eb] mx-6" />

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

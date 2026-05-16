'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface FormData {
  first_name: string
  last_name: string
  email: string
  alt_email: string
  phone: string
  country: string
  source_channel: string
  assigned_to: string
  notes: string
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '44px',
  border: '1px solid #d1d5db',
  padding: '10px 12px',
  fontSize: '16px',
  borderRadius: 0,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '6px',
}

export default function AddClientPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const [form, setForm] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    alt_email: '',
    phone: '',
    country: '',
    source_channel: '',
    assigned_to: 'Jose',
    notes: '',
  })

  function set(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApiError(null)
    setSaving(true)

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          alt_email: form.alt_email || null,
          phone: form.phone || null,
          country: form.country || null,
          source_channel: form.source_channel || null,
          assigned_to: form.assigned_to,
          notes: form.notes || null,
        }),
      })

      const data = await res.json() as { id?: string; error?: string }

      if (!res.ok) {
        setApiError(data.error ?? 'An error occurred.')
        setSaving(false)
        return
      }

      router.push('/clients')
    } catch {
      setApiError('Network error. Please try again.')
      setSaving(false)
    }
  }

  function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.target.style.borderColor = '#1A2C4E'
  }
  function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.target.style.borderColor = '#d1d5db'
  }

  const fieldWrapper = { marginBottom: '20px' }

  return (
    <div className="pb-24">
      <div className="mx-auto px-6 pt-6" style={{ maxWidth: '600px' }}>
        {/* Back link */}
        <Link
          href="/clients"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 w-fit mb-4"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Clients
        </Link>

        <h1 className="font-bold" style={{ fontSize: '24px', color: '#1A2C4E', marginBottom: '24px' }}>
          Add Client
        </h1>

        <form onSubmit={handleSubmit} noValidate>
          <div style={fieldWrapper}>
            <label style={labelStyle}>First Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={form.first_name}
              onChange={e => set('first_name', e.target.value)}
              onFocus={focusStyle}
              onBlur={blurStyle}
              style={inputStyle}
            />
          </div>

          <div style={fieldWrapper}>
            <label style={labelStyle}>Last Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={form.last_name}
              onChange={e => set('last_name', e.target.value)}
              onFocus={focusStyle}
              onBlur={blurStyle}
              style={inputStyle}
            />
          </div>

          <div style={fieldWrapper}>
            <label style={labelStyle}>Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => set('email', e.target.value)}
              onFocus={focusStyle}
              onBlur={blurStyle}
              style={inputStyle}
            />
          </div>

          <div style={fieldWrapper}>
            <label style={labelStyle}>Alt Email</label>
            <input
              type="email"
              value={form.alt_email}
              onChange={e => set('alt_email', e.target.value)}
              onFocus={focusStyle}
              onBlur={blurStyle}
              style={inputStyle}
            />
          </div>

          <div style={fieldWrapper}>
            <label style={labelStyle}>Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              onFocus={focusStyle}
              onBlur={blurStyle}
              style={inputStyle}
            />
          </div>

          <div style={fieldWrapper}>
            <label style={labelStyle}>Country</label>
            <input
              type="text"
              value={form.country}
              onChange={e => set('country', e.target.value)}
              onFocus={focusStyle}
              onBlur={blurStyle}
              style={inputStyle}
            />
          </div>

          <div style={fieldWrapper}>
            <label style={labelStyle}>Source Channel</label>
            <input
              type="text"
              placeholder="e.g. Instagram, Referral, Momence"
              value={form.source_channel}
              onChange={e => set('source_channel', e.target.value)}
              onFocus={focusStyle}
              onBlur={blurStyle}
              style={inputStyle}
            />
          </div>

          <div style={fieldWrapper}>
            <label style={labelStyle}>Assigned To</label>
            <select
              value={form.assigned_to}
              onChange={e => set('assigned_to', e.target.value)}
              onFocus={focusStyle}
              onBlur={blurStyle}
              style={{ ...inputStyle }}
            >
              <option value="Jose">Jose</option>
              <option value="Laurent">Laurent</option>
            </select>
          </div>

          <div style={fieldWrapper}>
            <label style={labelStyle}>Notes</label>
            <textarea
              rows={4}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              onFocus={focusStyle}
              onBlur={blurStyle}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {apiError && (
            <p className="text-red-500 text-sm mb-4">{apiError}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto font-semibold text-white"
            style={{
              background: saving ? '#9ca3af' : '#B8540A',
              padding: '12px 24px',
              fontSize: '16px',
              borderRadius: 0,
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save Client'}
          </button>
        </form>
      </div>
    </div>
  )
}

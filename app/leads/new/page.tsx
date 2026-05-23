'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Product {
  id: string
  name: string
  category: string
}

interface FormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  product_id: string
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

const fieldWrapper: React.CSSProperties = { marginBottom: '20px' }

export default function AddLeadPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const [form, setForm] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    product_id: '',
    source_channel: '',
    assigned_to: 'Jose',
    notes: '',
  })

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then((data: Product[]) => setProducts(data))
      .catch(() => {/* products are optional, silently ignore */})
  }, [])

  function set(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.target.style.borderColor = '#1A2C4E'
  }
  function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.target.style.borderColor = '#d1d5db'
  }

  // Group products by category for optgroup rendering
  const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApiError(null)
    setSaving(true)

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone || null,
          product_id: form.product_id || null,
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

      router.push('/leads')
    } catch {
      setApiError('Network error. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="pb-24">
      <div className="mx-auto px-6 pt-6" style={{ maxWidth: '600px' }}>
        {/* Back link */}
        <Link
          href="/leads"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 w-fit mb-4"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Leads
        </Link>

        <h1 className="font-bold" style={{ fontSize: '24px', color: '#1A2C4E', marginBottom: '24px' }}>
          Add Lead
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
            <label style={labelStyle}>Product of Interest</label>
            <select
              value={form.product_id}
              onChange={e => set('product_id', e.target.value)}
              onFocus={focusStyle}
              onBlur={blurStyle}
              style={inputStyle}
            >
              <option value="">Select a product (optional)</option>
              {Object.entries(grouped).map(([category, items]) => (
                <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                  {items.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
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
              style={inputStyle}
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

          <button type="submit" disabled={saving} className="btn-primary w-full md:w-auto">
            {saving ? 'Saving...' : 'Save Lead'}
          </button>
        </form>
      </div>
    </div>
  )
}

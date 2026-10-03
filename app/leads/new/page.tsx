'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'

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
  border: '1px solid #E4E7EC',
  padding: '10px 12px',
  fontSize: '16px',
  borderRadius: '8px',
  outline: 'none',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '44px',
  border: '1px solid #E4E7EC',
  paddingTop: '10px',
  paddingBottom: '10px',
  paddingLeft: '12px',
  fontSize: '16px',
  outline: 'none',
  boxSizing: 'border-box',
}

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

  function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.target.style.borderColor = 'var(--accent)'
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.target.style.borderColor = '#E4E7EC'
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
      <div className="mx-auto px-4 sm:px-6 pt-6" style={{ maxWidth: '720px' }}>
        <Link
          href="/leads"
          className="flex items-center gap-1 text-sm text-muted hover:text-heading w-fit mb-4"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Leads
        </Link>

        <PageHeader title="Add Lead" />

        <Card>
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">First Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={form.first_name}
                  onChange={e => set('first_name', e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Last Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={form.last_name}
                  onChange={e => set('last_name', e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={inputStyle}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Source Channel</label>
                <input
                  type="text"
                  placeholder="e.g. Instagram, Referral, Momence"
                  value={form.source_channel}
                  onChange={e => set('source_channel', e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={inputStyle}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Product of Interest</label>
                <select
                  value={form.product_id}
                  onChange={e => set('product_id', e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={selectStyle}
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

              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Assigned To</label>
                <select
                  value={form.assigned_to}
                  onChange={e => set('assigned_to', e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={selectStyle}
                >
                  <option value="Jose">Jose</option>
                  <option value="Laurent">Laurent</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Notes</label>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>

            {apiError && (
              <p className="text-red-500 text-sm mt-4">{apiError}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save Lead'}
              </button>
              <Link href="/leads" className="btn-secondary">
                Cancel
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

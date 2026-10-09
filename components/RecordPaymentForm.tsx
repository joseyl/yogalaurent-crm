'use client'

import { useState } from 'react'
import { formatGBP } from '@/lib/utils'

/**
 * Small form to record a payment against an order. Used on the client page
 * ("Record payment") and in Payments to Confirm ("Mark paid"). Saves through
 * POST /api/purchases/[id]/payments, which refuses more than is still owed.
 */

export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
] as const

export function methodLabel(method: string): string {
  if (method === 'bacs') return 'Bacs'
  return PAYMENT_METHODS.find(m => m.value === method)?.label ?? method
}

export interface RecordedPayment {
  id: string
  amount_gbp: number
  paid_on: string
  method: string
  note: string | null
  /** stripe: a Stripe balance payment (migration 011), never deleted from here */
  source?: 'hand' | 'stripe'
  /** Refunded on a Stripe balance payment, running total */
  refunded_gbp?: number
}

export interface RecordPaymentResult {
  payment: RecordedPayment
  amount_paid: number | null
  outstanding: number | null
}

/** Today's date in London as YYYY-MM-DD. */
export function londonToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '44px',
  border: '1px solid #E4E7EC',
  padding: '8px 10px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
}

interface Props {
  purchaseId: string
  /** What is still owed (order total minus amount paid; total when amount paid is blank) */
  outstanding: number
  /** Amount paid is blank on this order (old orders): saving starts it from 0 */
  paidBlank: boolean
  /** Fill the amount box with the outstanding amount (Mark paid) */
  prefillOutstanding?: boolean
  title?: string
  onSaved: (result: RecordPaymentResult) => void
  onCancel: () => void
}

export default function RecordPaymentForm({ purchaseId, outstanding, paidBlank, prefillOutstanding, title, onSaved, onCancel }: Props) {
  const [amount, setAmount] = useState(prefillOutstanding ? outstanding.toFixed(2) : '')
  const [paidOn, setPaidOn] = useState(londonToday())
  const [method, setMethod] = useState('bank_transfer')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const amt = Number(amount)
    if (amount.trim() === '' || !isFinite(amt) || amt <= 0) { setError('Enter an amount above 0.'); return }
    if (Math.abs(amt * 100 - Math.round(amt * 100)) > 1e-6) {
      setError('Enter the amount in pounds and pence.'); return
    }
    if (amt > outstanding + 1e-9) { setError(`That is more than is still owed. Only ${formatGBP(outstanding)} is owed on this order.`); return }
    if (!paidOn) { setError('Choose the date the payment was made.'); return }
    if (paidOn > londonToday()) { setError('The payment date cannot be after today.'); return }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/purchases/${purchaseId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, paid_on: paidOn, method, note: note.trim() || null }),
      })
      const data = await res.json() as RecordPaymentResult & { error?: string }
      if (!res.ok) { setError(data.error ?? 'Could not save the payment.'); return }
      onSaved(data)
    } catch {
      setError('Network error. Nothing was saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-card-border p-3 text-sm" style={{ background: 'var(--color-accent-tint)' }}>
      <p className="font-medium text-heading mb-1">{title ?? 'Record payment'}</p>
      <p className="text-xs text-muted mb-2">Still owed: {formatGBP(outstanding)}</p>
      {paidBlank && (
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-amber-vivid)' }}>
          No amount paid is recorded on this order yet, so this payment starts the count from 0. Anything paid before will not show.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Amount (GBP) *</label>
          <input type="number" min="0.01" step="0.01" max={outstanding} placeholder="0.00"
            value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Date paid *</label>
          <input type="date" max={londonToday()} value={paidOn} onChange={e => setPaidOn(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Method *</label>
          <select value={method} onChange={e => setMethod(e.target.value)} style={inputStyle}>
            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Note</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)} style={inputStyle} />
        </div>
      </div>
      {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save payment'}
        </button>
        <button onClick={onCancel} disabled={saving} className="btn-secondary">Cancel</button>
      </div>
    </div>
  )
}

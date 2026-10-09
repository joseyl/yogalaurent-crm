'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/** Done button on the dashboard's "Invoice to raise" list. */
export default function InvoiceDoneButton({ paymentId }: { paymentId: string }) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')

  async function done() {
    setState('saving')
    try {
      const res = await fetch(`/api/balance-payments/${paymentId}/invoiced`, { method: 'POST' })
      if (!res.ok) {
        setState('error')
        return
      }
      router.refresh()
    } catch {
      setState('error')
    }
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={done}
        disabled={state === 'saving'}
        className="btn-secondary text-xs min-h-[44px] md:min-h-0"
      >
        {state === 'saving' ? 'Saving...' : 'Done'}
      </button>
      {state === 'error' && <span className="text-xs" style={{ color: 'var(--color-red-vivid)' }}>Not saved, try again</span>}
    </span>
  )
}

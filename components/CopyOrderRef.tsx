'use client'

import { useState } from 'react'

/**
 * The order number a customer and Stripe know. The CRM adds -2, -3 to a TT number when
 * two buyers share one (lib/order-ref-collision.ts); those copies are the CRM's own, so a
 * TT number with a trailing -N is copied without it: TT-2026-2873-2 copies as TT-2026-2873.
 */
export function orderRefToCopy(orderRef: string): string {
  const ref = orderRef.trim()
  const m = ref.match(/^(TT-\d{4}-[A-Z0-9]+)-\d+$/i)
  return m ? m[1] : ref
}

/** Copy button beside an order number, for pasting into the website's staff page. */
export default function CopyOrderRef({ orderRef }: { orderRef: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const value = orderRefToCopy(orderRef)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setState('copied')
    } catch {
      setState('failed')
    }
    setTimeout(() => setState('idle'), 2000)
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${value}`}
      className="btn-secondary text-xs"
      style={{ minHeight: 28, padding: '2px 8px' }}
    >
      {state === 'copied' ? `Copied ${value}` : state === 'failed' ? 'Copy failed' : 'Copy'}
    </button>
  )
}

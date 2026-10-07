'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type State =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; text: string }
  | { kind: 'error'; text: string }

/** Refresh now button for the Momence status line on the dashboard. */
export default function MomenceRefreshButton() {
  const router = useRouter()
  const [state, setState] = useState<State>({ kind: 'idle' })

  async function run() {
    setState({ kind: 'running' })
    try {
      const res = await fetch('/api/momence-sync/refresh', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setState({ kind: 'error', text: body.error ?? `Failed (${res.status})` })
      } else {
        setState({
          kind: 'done',
          text: `Done: ${body.sessions_fetched ?? 0} classes, ${body.bookings_upserted ?? 0} bookings, ${body.passes_saved ?? 0} passes`,
        })
      }
    } catch {
      setState({ kind: 'error', text: 'No answer from the server. Check the status line in a few minutes.' })
    }
    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={state.kind === 'running'}
        className="btn-secondary text-sm min-h-[44px] md:min-h-0"
      >
        {state.kind === 'running' ? 'Running...' : 'Refresh now'}
      </button>
      {state.kind === 'running' && (
        <span className="text-xs text-muted">Takes about one to three minutes. Keep this page open.</span>
      )}
      {state.kind === 'done' && <span className="text-xs text-muted">{state.text}</span>}
      {state.kind === 'error' && <span className="text-xs" style={{ color: 'var(--color-red-vivid)' }}>{state.text}</span>}
    </div>
  )
}

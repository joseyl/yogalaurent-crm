'use client'

import { useState } from 'react'

type Tone = 'neutral' | 'warning' | 'danger'

const tonePill: Record<Tone, string> = {
  neutral: 'bg-grey-subtle text-grey-vivid',
  warning: 'bg-amber-subtle text-amber-vivid',
  danger:  'bg-red-subtle text-red-vivid',
}

interface CollapsibleProps {
  title: string
  count?: number | string
  defaultOpen?: boolean
  tone?: Tone
  children: React.ReactNode
}

export default function Collapsible({
  title,
  count,
  defaultOpen = false,
  tone = 'neutral',
  children,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-4 text-left md:px-5"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-heading">
          {title}
          {count !== undefined && (
            <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${tonePill[tone]}`}>
              {count}
            </span>
          )}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-card-border px-4 pb-5 pt-4 md:px-5">
          {children}
        </div>
      )}
    </div>
  )
}

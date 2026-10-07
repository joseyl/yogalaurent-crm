'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip,
} from 'recharts'
import LoadingSpinner from '@/app/components/LoadingSpinner'
import { formatGBP } from '@/lib/utils'
import PageHeader from '@/components/ui/PageHeader'
import Collapsible from '@/components/ui/Collapsible'
import PeriodFilter from '@/components/PeriodFilter'
import { periodRange, formatDay, type Period } from '@/lib/periods'

// ── Types (match app/api/reports/route.ts) ─────────────────────────────────────

interface Totals { revenue: number; sales: number }
interface ProductRow { id: string; name: string; cur: Totals; prev: Totals | null }
interface FamilyRow { family: string; cur: Totals; prev: Totals | null; products: ProductRow[] }
interface CategoryRow { category: string; label: string; cur: Totals; prev: Totals | null; families: FamilyRow[] }
interface Headline { revenue: number; sales: number; clients: number; lr: number; ttl: number }
interface ClassesBlock { buyers: number; newBuyers: number; returning: number; bookings: number | null }

interface ReportsData {
  range: { from: string | null; to: string | null }
  prevRange: { from: string; to: string } | null
  headline: { cur: Headline; prev: Headline | null }
  categories: CategoryRow[]
  trend: { byYear: boolean; rows: Record<string, number | string>[] }
  classes: { cur: ClassesBlock; prev: ClassesBlock | null }
}

// Fixed colour per category (validated categorical palette, light mode). Colour follows
// the category, never its rank.
const CATEGORY_COLOURS: Record<string, string> = {
  training: '#2a78d6',
  classes: '#eb6834',
  workshop: '#1baf7a',
  retreat: '#eda100',
  private: '#e87ba4',
  other: '#008300',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ── Helpers ────────────────────────────────────────────────────────────────────

function change(cur: number, prev: number | null | undefined): string | null {
  if (prev === null || prev === undefined) return null
  if (prev === 0) return cur === 0 ? '0%' : 'new'
  const pct = Math.round(((cur - prev) / Math.abs(prev)) * 100)
  return `${pct > 0 ? '+' : ''}${pct}%`
}

function bucketLabel(b: string, byYear: boolean): string {
  if (byYear) return b
  const [y, m] = b.split('-').map(Number)
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`
}

function share(part: number, total: number): string {
  if (!total) return ''
  return `${Math.round((part / total) * 100)}%`
}

// ── Headline ───────────────────────────────────────────────────────────────────

function HeadlineCards({ cur, prev }: { cur: Headline; prev: Headline | null }) {
  const cards = [
    { label: 'Revenue', value: formatGBP(cur.revenue), delta: change(cur.revenue, prev?.revenue), was: prev ? formatGBP(prev.revenue) : null },
    { label: 'Sales', value: String(cur.sales), delta: change(cur.sales, prev?.sales), was: prev ? String(prev.sales) : null },
    { label: 'Paying clients', value: String(cur.clients), delta: change(cur.clients, prev?.clients), was: prev ? String(prev.clients) : null },
  ]
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map(c => (
        <div key={c.label} className="card p-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">{c.label}</p>
          <p className="text-2xl font-bold text-heading mt-1">{c.value}</p>
          {c.delta && <p className="text-xs text-muted mt-1">{c.delta} vs last year ({c.was})</p>}
        </div>
      ))}
      <div className="card p-5">
        <p className="text-xs font-medium text-muted uppercase tracking-wide">By business</p>
        <div className="mt-2 flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between gap-2"><span className="text-body">Laurent Roure</span><span className="font-medium text-heading">{formatGBP(cur.lr)}</span></div>
          <div className="flex justify-between gap-2"><span className="text-body">Terra Training Ltd</span><span className="font-medium text-heading">{formatGBP(cur.ttl)}</span></div>
          {prev && (
            <p className="text-xs text-muted mt-1">
              vs last year: {change(cur.lr, prev.lr)} and {change(cur.ttl, prev.ttl)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Revenue table ──────────────────────────────────────────────────────────────

const th: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', borderBottom: '1px solid var(--color-card-border)', whiteSpace: 'nowrap' }
const tdBase: React.CSSProperties = { padding: '10px 12px', fontSize: 14, borderBottom: '1px solid var(--color-card-border)', verticalAlign: 'middle' }
const num: React.CSSProperties = { ...tdBase, textAlign: 'right', whiteSpace: 'nowrap' }

function RevenueTable({ categories, total, hasPrev }: { categories: CategoryRow[]; total: number; hasPrev: boolean }) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (key: string) => setOpen(s => {
    const n = new Set(s)
    if (n.has(key)) n.delete(key); else n.add(key)
    return n
  })

  function cells(t: Totals, prev: Totals | null) {
    return (
      <>
        <td style={num}>{t.sales}</td>
        <td style={num}>{formatGBP(t.revenue)}</td>
        <td style={num} className="hidden md:table-cell">{share(t.revenue, total)}</td>
        {hasPrev && <td style={num}>{change(t.revenue, prev?.revenue) ?? ''}</td>}
      </>
    )
  }

  if (categories.length === 0) {
    return <p className="text-muted italic text-sm text-center py-4">No sales in this period.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th style={th}>Category, family, product</th>
            <th style={{ ...th, textAlign: 'right' }}>Sales</th>
            <th style={{ ...th, textAlign: 'right' }}>Revenue</th>
            <th style={{ ...th, textAlign: 'right' }} className="hidden md:table-cell">Share</th>
            {hasPrev && <th style={{ ...th, textAlign: 'right' }}>vs last year</th>}
          </tr>
        </thead>
        <tbody>
          {categories.map(c => {
            const cKey = c.category
            const cOpen = open.has(cKey)
            return (
              <Fragment key={cKey}>
                <tr className="cursor-pointer hover:bg-grey-subtle" onClick={() => toggle(cKey)}>
                  <td style={{ ...tdBase, fontWeight: 600 }} className="text-heading">
                    <span className="inline-block w-4 text-muted">{cOpen ? '-' : '+'}</span>
                    <span className="inline-block w-2.5 h-2.5 mr-2 align-middle" style={{ background: CATEGORY_COLOURS[c.category] ?? '#667085', borderRadius: 2 }} />
                    {c.label}
                  </td>
                  {cells(c.cur, c.prev)}
                </tr>
                {cOpen && c.families.map(f => {
                  const fKey = `${cKey}::${f.family}`
                  const fOpen = open.has(fKey)
                  const single = f.products.length === 1 && f.products[0].name === f.family
                  return (
                    <Fragment key={fKey}>
                      <tr className={single ? '' : 'cursor-pointer hover:bg-grey-subtle'} onClick={() => !single && toggle(fKey)}>
                        <td style={{ ...tdBase, paddingLeft: 36 }} className="text-body">
                          {single ? (
                            <Link href={`/products/${f.products[0].id}`} className="hover:underline" onClick={e => e.stopPropagation()}>{f.family}</Link>
                          ) : (
                            <><span className="inline-block w-4 text-muted">{fOpen ? '-' : '+'}</span>{f.family}</>
                          )}
                        </td>
                        {cells(f.cur, f.prev)}
                      </tr>
                      {!single && fOpen && f.products.map(p => (
                        <tr key={p.id}>
                          <td style={{ ...tdBase, paddingLeft: 60, fontSize: 13 }} className="text-muted">
                            <Link href={`/products/${p.id}`} className="hover:underline">{p.name}</Link>
                          </td>
                          {cells(p.cur, p.prev)}
                        </tr>
                      ))}
                    </Fragment>
                  )
                })}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      <p className="text-xs text-muted mt-2 px-3">Click a line to open it. Sales count paid sales only (bundle parts and free places at 0 are not counted).</p>
    </div>
  )
}

// ── Trend chart ────────────────────────────────────────────────────────────────

function TrendChart({ trend, categories }: { trend: ReportsData['trend']; categories: CategoryRow[] }) {
  const keys = categories.map(c => c.category)
  const data = trend.rows.map(r => ({ ...r, label: bucketLabel(String(r.bucket), trend.byYear) }))
  if (data.length === 0 || keys.length === 0) return <p className="text-muted italic text-sm text-center py-4">No sales in this period.</p>
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F7" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v: number) => `£${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          formatter={(v, name) => [formatGBP(Number(v ?? 0)), categories.find(c => c.category === String(name))?.label ?? String(name)]}
          contentStyle={{ borderRadius: 8, border: '1px solid #E4E7EC', fontSize: 12, padding: '8px 12px' }}
          cursor={{ fill: '#F2F4F7' }}
        />
        <Legend formatter={(name: string) => <span style={{ color: '#475467', fontSize: 12 }}>{categories.find(c => c.category === name)?.label ?? name}</span>} />
        {keys.map(k => (
          <Bar key={k} dataKey={k} stackId="rev" fill={CATEGORY_COLOURS[k] ?? '#667085'} stroke="#ffffff" strokeWidth={1} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Classes in detail ──────────────────────────────────────────────────────────

function ClassesDetail({ data, classesRow }: { data: ReportsData['classes']; classesRow: CategoryRow | undefined }) {
  const { cur, prev } = data
  const stats = [
    { label: 'Class bookings', value: cur.bookings === null ? 'unavailable' : String(cur.bookings), delta: cur.bookings !== null ? change(cur.bookings, prev?.bookings ?? null) : null },
    { label: 'Buyers', value: String(cur.buyers), delta: change(cur.buyers, prev?.buyers) },
    { label: 'New buyers', value: String(cur.newBuyers), delta: change(cur.newBuyers, prev?.newBuyers) },
    { label: 'Returning buyers', value: String(cur.returning), delta: change(cur.returning, prev?.returning) },
  ]
  return (
    <div className="p-4 md:p-5 pt-0 md:pt-0">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="border border-card-border rounded-lg p-3">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="text-xl font-bold text-heading">{s.value}</p>
            {s.delta && <p className="text-xs text-muted">{s.delta} vs last year</p>}
          </div>
        ))}
      </div>
      {classesRow && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">What was sold</p>
          <ul className="text-sm divide-y divide-card-border">
            {classesRow.families.flatMap(f => f.products.map(p => ({ f: f.family, p }))).filter(x => x.p.cur.sales > 0 || x.p.cur.revenue !== 0).map(({ f, p }) => (
              <li key={p.id} className="flex justify-between gap-3 py-2">
                <span className="text-body">{p.name} <span className="text-muted text-xs">({f})</span></span>
                <span className="text-heading whitespace-nowrap">{p.cur.sales} sold, {formatGBP(p.cur.revenue)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted mt-3">
        New buyer: first ever paid classes purchase falls in this period. Bookings count every booking not cancelled, including training sessions until class types are labelled.
      </p>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('this_year')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  // Each result is stored with the dates it was loaded for, so "updating" is simply
  // "the figures on screen are not for the dates now chosen"
  const [loaded, setLoaded] = useState<{ key: string; data: ReportsData | null; error: string | null } | null>(null)

  const range = periodRange(period, customFrom, customTo)
  const key = `${range.from ?? ''}|${range.to ?? ''}`
  const updating = loaded?.key !== key
  const data = loaded?.data ?? null
  const error = loaded?.key === key ? loaded.error : null

  useEffect(() => {
    let cancelled = false
    const sp = new URLSearchParams()
    if (range.from) sp.set('date_from', range.from)
    if (range.to) sp.set('date_to', range.to)
    fetch(`/api/reports${sp.toString() ? '?' + sp.toString() : ''}`)
      .then(async r => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(body.error ?? 'Failed to load reports. Please refresh.')
        return body as ReportsData
      })
      .then(d => { if (!cancelled) setLoaded({ key, data: d, error: null }) })
      .catch((err: Error) => { if (!cancelled) setLoaded(prev => ({ key, data: prev?.data ?? null, error: err.message })) })
    return () => { cancelled = true }
  }, [key, range.from, range.to])

  if (!data && updating) return <LoadingSpinner message="Loading reports..." />

  const hasPrev = !!data?.prevRange
  const classesRow = data?.categories.find(c => c.category === 'classes')

  return (
    <div className="px-4 md:px-6 pb-24">
      <PageHeader title="Reports" />

      <div className="card mb-6 p-4">
        <PeriodFilter
          period={period}
          customFrom={customFrom}
          customTo={customTo}
          onChange={next => { setPeriod(next.period); setCustomFrom(next.customFrom); setCustomTo(next.customTo) }}
          showSummary
        />
        <p className="text-xs text-muted mt-1">
          {data?.prevRange
            ? `Compared with: ${formatDay(data.prevRange.from)} to ${formatDay(data.prevRange.to)}`
            : 'No comparison for this period (it needs a start and an end date).'}
          {updating && ' Updating...'}
        </p>
      </div>

      {error && <p className="text-sm mb-4" style={{ color: 'var(--color-red-vivid)' }}>{error}</p>}

      {data && (
        <div className={`space-y-4 ${updating ? 'opacity-60' : ''}`}>
          <HeadlineCards cur={data.headline.cur} prev={data.headline.prev} />

          <Collapsible title="Revenue by category" defaultOpen>
            <div className="px-1 md:px-2 pb-4">
              <RevenueTable categories={data.categories} total={data.headline.cur.revenue} hasPrev={hasPrev} />
            </div>
          </Collapsible>

          <Collapsible title={data.trend.byYear ? 'Revenue by year' : 'Revenue by month'} defaultOpen>
            <div className="px-2 pb-4">
              <TrendChart trend={data.trend} categories={data.categories} />
            </div>
          </Collapsible>

          <Collapsible title="Classes in detail" defaultOpen>
            <ClassesDetail data={data.classes} classesRow={classesRow} />
          </Collapsible>

          <div className="card p-4 md:p-5 text-sm text-body">
            <p className="font-semibold text-heading mb-2">What these figures include</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Purchases dated in the period, in pounds, before fees. Revenue counts each purchase once, by its date.</li>
              <li>Teacher trainings count the order total, not the cash received so far.</li>
              <li>Momence passes are recorded at list price; discounted passes show the full price. Unlimited Pass renewals are missing.</li>
              <li>Retreats booked through WeTravel are only included if they were typed in.</li>
              <li>Not checked against the bank or Stripe. For internal use.</li>
            </ul>
            <p className="mt-3 text-muted">
              Who spent most? Open the <Link href="/clients" className="underline">Clients page</Link>, choose the same period and sort by spend.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

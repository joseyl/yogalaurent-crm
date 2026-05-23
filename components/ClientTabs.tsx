'use client'

import { useState, useEffect, Fragment } from 'react'
import { Edit2, Trash2, RefreshCcw, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import { formatGBP } from '@/lib/utils'

interface Product {
  id: string
  name: string
  category: string
  entity: string
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

interface Interest {
  id: string
  product_id: string
  source: string | null
  added_date: string
  added_by: string
  notes: string | null
  product_name: string
  category: string
}

interface PurchaseFormState {
  product_id: string
  amount_gbp: string
  purchase_date: string
  notes: string
  edition: string
  cohort_year: string
}

interface Props {
  personId: string
  purchases: Purchase[]
  attendance: Attendance[]
  leads: LeadRecord[]
  products: Product[]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatMonthYear(dateStr: string): string {
  const [y, m] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

function todayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const TABS = ['Purchases', 'Attendance', 'Lead History', 'Interests'] as const
type Tab = typeof TABS[number]

const CATEGORY_ORDER = ['training', 'retreat', 'workshop', 'private', 'classes', 'other'] as const
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const PAGE_SIZE = 20

const formInputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '44px',
  border: '1px solid #d1d5db',
  padding: '8px 10px',
  fontSize: '14px',
  borderRadius: 0,
  outline: 'none',
  boxSizing: 'border-box',
}

const inlineInputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '36px',
  border: '1px solid #d1d5db',
  padding: '5px 8px',
  fontSize: '13px',
  borderRadius: 0,
  outline: 'none',
  boxSizing: 'border-box',
}

const primaryBtnStyle: React.CSSProperties = {
  background: '#1A2C4E',
  color: 'white',
  border: 'none',
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: 600,
  minHeight: '44px',
  borderRadius: 0,
  cursor: 'pointer',
}

const amberBtnStyle: React.CSSProperties = {
  background: '#B8540A',
  color: 'white',
  border: 'none',
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: 600,
  minHeight: '44px',
  borderRadius: 0,
  cursor: 'pointer',
}

const destructiveBtnStyle: React.CSSProperties = {
  background: '#B8540A',
  color: 'white',
  border: 'none',
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: 600,
  minHeight: '44px',
  borderRadius: 0,
  cursor: 'pointer',
}

const cancelBtnStyle: React.CSSProperties = {
  background: 'none',
  color: '#374151',
  border: '1px solid #d1d5db',
  padding: '10px 16px',
  fontSize: '13px',
  minHeight: '44px',
  borderRadius: 0,
  cursor: 'pointer',
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '5px',
  cursor: 'pointer',
  color: '#6b7280',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 2,
}

const saveRowBtnStyle: React.CSSProperties = {
  background: '#1A2C4E',
  color: 'white',
  border: 'none',
  padding: '5px 10px',
  fontSize: '12px',
  fontWeight: 600,
  borderRadius: 0,
  cursor: 'pointer',
}

const cancelRowBtnStyle: React.CSSProperties = {
  background: 'none',
  color: '#374151',
  border: '1px solid #d1d5db',
  padding: '5px 10px',
  fontSize: '12px',
  borderRadius: 0,
  cursor: 'pointer',
}

function ProductSelect({
  value,
  onChange,
  grouped,
  style,
}: {
  value: string
  onChange: (v: string) => void
  grouped: Record<string, Product[]>
  style?: React.CSSProperties
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={style ?? formInputStyle}>
      <option value="">Select product</option>
      {Object.entries(grouped).map(([cat, items]) => (
        <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
          {items.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

export default function ClientTabs({ personId, purchases, attendance, leads, products }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Purchases')
  const [yearFilter, setYearFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [groupVisible, setGroupVisible] = useState<Map<string, number>>(new Map())

  const [purchaseList, setPurchaseList] = useState<Purchase[]>(purchases)

  // Add purchase form
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<PurchaseFormState>({ product_id: '', amount_gbp: '', purchase_date: todayStr(), notes: '', edition: '', cohort_year: '' })
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Edit purchase form
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<PurchaseFormState>({ product_id: '', amount_gbp: '', purchase_date: '', notes: '', edition: '', cohort_year: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Refund form
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [refundForm, setRefundForm] = useState({ amount: '', note: '' })
  const [refundSaving, setRefundSaving] = useState(false)
  const [refundError, setRefundError] = useState<string | null>(null)

  // Interests state — null means not yet fetched
  const [interests, setInterests] = useState<Interest[] | null>(null)
  const [showAddInterestForm, setShowAddInterestForm] = useState(false)
  const [addInterestForm, setAddInterestForm] = useState({ product_id: '', source: '', notes: '' })
  const [addInterestSaving, setAddInterestSaving] = useState(false)
  const [addInterestError, setAddInterestError] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab !== 'Interests') return
    fetch(`/api/interests/by-person/${personId}`)
      .then(r => r.json() as Promise<Interest[]>)
      .then(d => setInterests(d))
      .catch(() => setInterests([]))
  }, [activeTab, personId])

  // Product dropdown grouped in the required category order
  const groupedProducts = CATEGORY_ORDER.reduce<Record<string, Product[]>>((acc, cat) => {
    const items = products.filter(p => p.category === cat).sort((a, b) => a.name.localeCompare(b.name))
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})

  // Year options from all purchases, descending
  const yearOptions = Array.from(new Set(purchaseList.map(p => p.purchase_date.slice(0, 4)))).sort((a, b) => Number(b) - Number(a))

  // Filtered purchases by year/month
  const filteredPurchases = purchaseList.filter(p => {
    if (!yearFilter) return true
    if (p.purchase_date.slice(0, 4) !== yearFilter) return false
    if (monthFilter && p.purchase_date.slice(5, 7) !== monthFilter) return false
    return true
  })

  const filteredTotal = filteredPurchases.reduce((s, p) => s + Number(p.amount_gbp ?? 0), 0)
  const filteredCount = filteredPurchases.length

  function buildSummaryText(): string {
    if (filteredCount === 0) {
      return yearFilter || monthFilter ? 'No purchases in this period' : 'No purchases recorded'
    }
    const spend = formatGBP(filteredTotal)
    const countStr = `${filteredCount} purchase${filteredCount === 1 ? '' : 's'}`
    if (yearFilter && monthFilter) {
      return `${spend} from ${countStr} in ${MONTH_NAMES[Number(monthFilter) - 1]} ${yearFilter}`
    }
    if (yearFilter) {
      return `${spend} from ${countStr} in ${yearFilter}`
    }
    const sortedDates = filteredPurchases.map(p => p.purchase_date).filter(Boolean).sort()
    if (sortedDates.length <= 1) return `${spend} from ${countStr}`
    return `${spend} from ${countStr} · ${formatMonthYear(sortedDates[0])} – ${formatMonthYear(sortedDates[sortedDates.length - 1])}`
  }

  // Purchase groups sorted by total spend descending
  const purchaseGroupsMap: Record<string, { productName: string; purchases: Purchase[]; total: number }> = {}
  for (const p of filteredPurchases) {
    const key = p.product_name
    if (!purchaseGroupsMap[key]) purchaseGroupsMap[key] = { productName: p.product_name, purchases: [], total: 0 }
    purchaseGroupsMap[key].purchases.push(p)
    purchaseGroupsMap[key].total += Number(p.amount_gbp ?? 0)
  }
  const purchaseGroups = Object.values(purchaseGroupsMap).sort((a, b) => b.total - a.total)

  // Detect if add-form selected product is training
  const addProductCategory = addForm.product_id ? products.find(p => p.id === addForm.product_id)?.category ?? null : null
  const isAddTraining = addProductCategory === 'training'

  const lastAttendance = attendance[0]?.class_date ?? null
  const attendanceCount = attendance.length

  function findProduct(pid: string): Product | undefined {
    return products.find(p => p.id === pid)
  }

  function toggleGroup(name: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function showMoreGroup(name: string) {
    setGroupVisible(prev => {
      const next = new Map(prev)
      next.set(name, (next.get(name) ?? PAGE_SIZE) + PAGE_SIZE)
      return next
    })
  }

  // ── Add purchase ──────────────────────────────────────────────────────────

  function openAddForm() {
    setShowAddForm(true)
    setAddForm({ product_id: '', amount_gbp: '', purchase_date: todayStr(), notes: '', edition: '', cohort_year: '' })
    setAddError(null)
  }

  async function handleAddPurchase() {
    if (!addForm.product_id) { setAddError('Please select a product.'); return }
    const amt = Number(addForm.amount_gbp)
    if (addForm.amount_gbp === '' || isNaN(amt) || amt < 0) { setAddError('Please enter a valid amount (0 or more).'); return }
    if (!addForm.purchase_date) { setAddError('Please select a date.'); return }

    setAddSaving(true)
    setAddError(null)
    try {
      const body: Record<string, unknown> = {
        person_id: personId,
        product_id: addForm.product_id,
        amount_gbp: amt,
        purchase_date: addForm.purchase_date,
        notes: addForm.notes || null,
      }
      if (addForm.edition.trim()) body.edition = addForm.edition.trim()
      if (addForm.cohort_year.trim()) body.cohort_year = parseInt(addForm.cohort_year, 10)

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { id?: string; error?: string }
      if (!res.ok) { setAddError(data.error ?? 'Failed to add.'); setAddSaving(false); return }
      const prod = findProduct(addForm.product_id)
      const newPurchase: Purchase = {
        id: data.id!,
        product_id: addForm.product_id,
        amount_gbp: amt,
        purchase_date: addForm.purchase_date,
        notes: addForm.notes || null,
        product_name: prod?.name ?? '—',
        category: prod?.category ?? 'other',
        edition: addForm.edition.trim() || null,
        cohort_year: addForm.cohort_year.trim() ? parseInt(addForm.cohort_year, 10) : null,
      }
      setPurchaseList(prev => [newPurchase, ...prev])
      setShowAddForm(false)
    } catch {
      setAddError('Network error.')
    } finally {
      setAddSaving(false)
    }
  }

  // ── Edit purchase ─────────────────────────────────────────────────────────

  function startEditPurchase(p: Purchase) {
    setEditingId(p.id)
    setEditForm({
      product_id: p.product_id,
      amount_gbp: String(p.amount_gbp),
      purchase_date: p.purchase_date,
      notes: p.notes ?? '',
      edition: '',
      cohort_year: '',
    })
    setEditError(null)
    setRefundingId(null)
  }

  async function handleEditSave() {
    if (!editingId) return
    if (!editForm.product_id) { setEditError('Please select a product.'); return }
    const amt = Number(editForm.amount_gbp)
    if (editForm.amount_gbp === '' || isNaN(amt)) { setEditError('Please enter a valid amount.'); return }
    if (!editForm.purchase_date) { setEditError('Please select a date.'); return }

    setEditSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/purchases/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: editForm.product_id,
          amount_gbp: amt,
          purchase_date: editForm.purchase_date,
          notes: editForm.notes || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setEditError(data.error ?? 'Failed to save.')
        setEditSaving(false)
        return
      }
      const prod = findProduct(editForm.product_id)
      const savedId = editingId
      setPurchaseList(prev => prev.map(p => p.id === savedId ? {
        ...p,
        product_id: editForm.product_id,
        amount_gbp: amt,
        purchase_date: editForm.purchase_date,
        notes: editForm.notes || null,
        product_name: prod?.name ?? p.product_name,
        category: prod?.category ?? p.category,
      } : p))
      setEditingId(null)
    } catch {
      setEditError('Network error.')
    } finally {
      setEditSaving(false)
    }
  }

  // ── Delete purchase ───────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this purchase? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/purchases/${id}`, { method: 'DELETE' })
      if (!res.ok) return
      setPurchaseList(prev => prev.filter(p => p.id !== id))
    } catch {
      // silent
    }
  }

  // ── Refund purchase ───────────────────────────────────────────────────────

  function startRefund(p: Purchase) {
    setRefundingId(p.id)
    setRefundForm({ amount: '', note: `Refund - ${p.product_name}` })
    setRefundError(null)
    setEditingId(null)
  }

  async function handleRefundConfirm(original: Purchase) {
    const refundAmt = Number(refundForm.amount)
    if (!refundForm.amount || isNaN(refundAmt) || refundAmt <= 0) {
      setRefundError('Enter a positive refund amount.')
      return
    }
    if (refundAmt > original.amount_gbp) {
      setRefundError(`Cannot exceed the original amount of ${formatGBP(original.amount_gbp)}.`)
      return
    }
    setRefundSaving(true)
    setRefundError(null)
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_id: personId,
          product_id: original.product_id,
          amount_gbp: -refundAmt,
          purchase_date: todayStr(),
          notes: refundForm.note || null,
        }),
      })
      const data = await res.json() as { id?: string; error?: string }
      if (!res.ok) { setRefundError(data.error ?? 'Failed to process refund.'); setRefundSaving(false); return }
      const refundRow: Purchase = {
        id: data.id!,
        product_id: original.product_id,
        amount_gbp: -refundAmt,
        purchase_date: todayStr(),
        notes: refundForm.note || null,
        product_name: original.product_name,
        category: original.category,
        edition: null,
        cohort_year: null,
      }
      setPurchaseList(prev => [refundRow, ...prev])
      setRefundingId(null)
    } catch {
      setRefundError('Network error.')
    } finally {
      setRefundSaving(false)
    }
  }

  // ── Add interest ──────────────────────────────────────────────────────────

  function openAddInterestForm() {
    setShowAddInterestForm(true)
    setAddInterestForm({ product_id: '', source: '', notes: '' })
    setAddInterestError(null)
  }

  async function handleAddInterest() {
    if (!addInterestForm.product_id) { setAddInterestError('Please select a product.'); return }
    setAddInterestSaving(true)
    setAddInterestError(null)
    try {
      const res = await fetch('/api/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_id: personId,
          product_id: addInterestForm.product_id,
          source: addInterestForm.source || null,
          notes: addInterestForm.notes || null,
        }),
      })
      const data = await res.json() as { error?: string }
      if (res.status === 409) {
        setAddInterestError('This person is already tagged as interested in that product.')
        setAddInterestSaving(false)
        return
      }
      if (!res.ok) { setAddInterestError(data.error ?? 'Failed to add.'); setAddInterestSaving(false); return }
      const refreshRes = await fetch(`/api/interests/by-person/${personId}`)
      const refreshed = await refreshRes.json() as Interest[]
      setInterests(refreshed as Interest[])
      setShowAddInterestForm(false)
    } catch {
      setAddInterestError('Network error.')
    } finally {
      setAddInterestSaving(false)
    }
  }

  // ── Remove interest ───────────────────────────────────────────────────────

  async function handleRemoveInterest(id: string) {
    try {
      const res = await fetch(`/api/interests?id=${id}`, { method: 'DELETE' })
      if (!res.ok) return
      setInterests(prev => prev ? prev.filter(i => i.id !== id) : prev)
    } catch {
      // silent
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Tab bar — scrollable on mobile */}
      <div className="border-b border-[#e5e7eb] overflow-x-auto">
        <div className="flex">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap"
              style={{
                color: activeTab === tab ? '#1A2C4E' : '#6b7280',
                borderBottom: activeTab === tab ? '2px solid #1A2C4E' : '2px solid transparent',
                fontWeight: activeTab === tab ? 600 : 400,
                background: 'none',
                cursor: 'pointer',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">

        {/* ── PURCHASES TAB ──────────────────────────────────────────────── */}
        {activeTab === 'Purchases' && (
          <div>
            {/* Header */}
            <div className="flex items-center justify-end mb-4">
              <button
                onClick={openAddForm}
                className="flex items-center gap-1.5 font-semibold text-white text-sm"
                style={{ background: '#1A2C4E', padding: '8px 14px', minHeight: '36px', borderRadius: 0, border: 'none', cursor: 'pointer' }}
              >
                <Plus size={14} />
                Add Purchase
              </button>
            </div>

            {/* Add purchase form */}
            {showAddForm && (
              <div className="border border-[#e5e7eb] p-4 mb-4" style={{ background: '#f9fafb' }}>
                <p className="font-medium text-sm mb-3" style={{ color: '#1A2C4E' }}>New Purchase</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Product *</label>
                    <ProductSelect
                      value={addForm.product_id}
                      onChange={v => setAddForm(f => ({ ...f, product_id: v, edition: '', cohort_year: '' }))}
                      grouped={groupedProducts}
                    />
                  </div>
                  {isAddTraining && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Edition</label>
                        <input
                          type="text"
                          placeholder="e.g. Winter 2021, Spring 2025"
                          value={addForm.edition}
                          onChange={e => setAddForm(f => ({ ...f, edition: e.target.value }))}
                          style={formInputStyle}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Cohort Year</label>
                        <input
                          type="number"
                          placeholder="e.g. 2025"
                          min={2020}
                          max={2030}
                          value={addForm.cohort_year}
                          onChange={e => setAddForm(f => ({ ...f, cohort_year: e.target.value }))}
                          style={formInputStyle}
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Amount (GBP) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={addForm.amount_gbp}
                      onChange={e => setAddForm(f => ({ ...f, amount_gbp: e.target.value }))}
                      style={formInputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date *</label>
                    <input
                      type="date"
                      value={addForm.purchase_date}
                      onChange={e => setAddForm(f => ({ ...f, purchase_date: e.target.value }))}
                      style={formInputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Notes</label>
                    <input
                      type="text"
                      value={addForm.notes}
                      onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                      style={formInputStyle}
                    />
                  </div>
                </div>
                {addError && <p className="text-red-500 text-xs mb-2">{addError}</p>}
                <div className="flex gap-2">
                  <button onClick={handleAddPurchase} disabled={addSaving} style={{ ...primaryBtnStyle, opacity: addSaving ? 0.6 : 1 }}>
                    {addSaving ? 'Saving...' : 'Save Purchase'}
                  </button>
                  <button onClick={() => { setShowAddForm(false); setAddError(null) }} style={cancelBtnStyle}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Summary bar */}
            <div className="px-3 py-2.5 mb-3 border border-[#e5e7eb]" style={{ background: '#f9fafb' }}>
              <p className="font-bold text-sm" style={{ color: '#1A2C4E' }}>{buildSummaryText()}</p>
            </div>

            {/* Year / Month filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <select
                value={yearFilter}
                onChange={e => { setYearFilter(e.target.value); setMonthFilter('') }}
                className="border border-[#d1d5db] px-3 py-2 text-sm bg-white focus:outline-none"
                style={{ borderRadius: 0, minHeight: '40px' }}
              >
                <option value="">All years</option>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {yearFilter && (
                <select
                  value={monthFilter}
                  onChange={e => setMonthFilter(e.target.value)}
                  className="border border-[#d1d5db] px-3 py-2 text-sm bg-white focus:outline-none"
                  style={{ borderRadius: 0, minHeight: '40px' }}
                >
                  <option value="">All months</option>
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Grouped purchases */}
            {filteredPurchases.length === 0 ? (
              <p className="text-gray-400 text-sm">No purchases recorded.</p>
            ) : (
              <div className="space-y-1">
                {purchaseGroups.map(group => {
                  const isExpanded = expandedGroups.has(group.productName)
                  const visible = groupVisible.get(group.productName) ?? PAGE_SIZE
                  const rows = group.purchases.slice(0, visible)

                  return (
                    <div key={group.productName}>
                      {/* Group header */}
                      <button
                        onClick={() => toggleGroup(group.productName)}
                        className="w-full flex items-center justify-between px-3 py-2.5 border border-[#e5e7eb] text-left"
                        style={{ background: '#f9fafb', borderRadius: 0, cursor: 'pointer', border: '1px solid #e5e7eb' }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isExpanded
                            ? <ChevronDown size={14} className="shrink-0" style={{ color: '#6b7280' }} />
                            : <ChevronRight size={14} className="shrink-0" style={{ color: '#6b7280' }} />
                          }
                          <span className="font-medium text-sm truncate" style={{ color: '#1A2C4E' }}>{group.productName}</span>
                          <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                            {group.purchases.length} purchase{group.purchases.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <span
                          className="font-semibold text-sm shrink-0 ml-3 whitespace-nowrap"
                          style={{ color: group.total < 0 ? '#ef4444' : '#1A2C4E' }}
                        >
                          {formatGBP(group.total)}
                        </span>
                      </button>

                      {/* Expanded rows */}
                      {isExpanded && (
                        <div className="border border-t-0 border-[#e5e7eb]">
                          {rows.map(p => (
                            <Fragment key={p.id}>
                              {editingId === p.id ? (
                                <div className="px-3 py-3 border-b border-[#f3f4f6]" style={{ background: '#f9fafb' }}>
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Product</label>
                                      <ProductSelect
                                        value={editForm.product_id}
                                        onChange={v => setEditForm(f => ({ ...f, product_id: v }))}
                                        grouped={groupedProducts}
                                        style={inlineInputStyle}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Amount</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={editForm.amount_gbp}
                                        onChange={e => setEditForm(f => ({ ...f, amount_gbp: e.target.value }))}
                                        style={inlineInputStyle}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Date</label>
                                      <input
                                        type="date"
                                        value={editForm.purchase_date}
                                        onChange={e => setEditForm(f => ({ ...f, purchase_date: e.target.value }))}
                                        style={inlineInputStyle}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Notes</label>
                                      <input
                                        type="text"
                                        value={editForm.notes}
                                        onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                                        style={inlineInputStyle}
                                      />
                                    </div>
                                  </div>
                                  {editError && <p className="text-red-500 text-xs mb-2">{editError}</p>}
                                  <div className="flex gap-2">
                                    <button onClick={handleEditSave} disabled={editSaving} style={saveRowBtnStyle}>
                                      {editSaving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button onClick={() => setEditingId(null)} style={cancelRowBtnStyle}>Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#f3f4f6]">
                                  <span className="text-xs text-gray-500 whitespace-nowrap w-[90px] shrink-0">{formatDate(p.purchase_date)}</span>
                                  <span
                                    className="text-xs font-semibold w-[76px] shrink-0 text-right"
                                    style={{ color: p.amount_gbp < 0 ? '#ef4444' : '#1A2C4E' }}
                                  >
                                    {formatGBP(Number(p.amount_gbp))}
                                  </span>
                                  <span className="text-xs text-gray-500 flex-1 min-w-0 truncate">{p.notes ?? '—'}</span>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <div className="relative group">
                                      <button onClick={() => startEditPurchase(p)} style={iconBtnStyle}>
                                        <Edit2 size={13} />
                                      </button>
                                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-none whitespace-nowrap z-10" style={{ background: '#1A2C4E' }}>Edit</span>
                                    </div>
                                    {Number(p.amount_gbp) > 0 && (
                                      <div className="relative group">
                                        <button onClick={() => startRefund(p)} style={iconBtnStyle}>
                                          <RefreshCcw size={13} />
                                        </button>
                                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-none whitespace-nowrap z-10" style={{ background: '#1A2C4E' }}>Issue refund</span>
                                      </div>
                                    )}
                                    <div className="relative group">
                                      <button onClick={() => handleDelete(p.id)} style={{ ...iconBtnStyle, color: '#B8540A' }}>
                                        <Trash2 size={13} />
                                      </button>
                                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-none whitespace-nowrap z-10" style={{ background: '#1A2C4E' }}>Delete</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {refundingId === p.id && (
                                <div className="px-3 py-3 border-b border-[#f3f4f6]">
                                  <div className="border border-[#fde68a] p-3" style={{ background: '#fffbeb' }}>
                                    <p className="text-xs font-semibold mb-2" style={{ color: '#92400e' }}>
                                      Issue refund for {p.product_name} (max {formatGBP(p.amount_gbp)})
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Refund Amount *</label>
                                        <input
                                          type="number"
                                          min="0.01"
                                          step="0.01"
                                          max={p.amount_gbp}
                                          placeholder="0.00"
                                          value={refundForm.amount}
                                          onChange={e => setRefundForm(f => ({ ...f, amount: e.target.value }))}
                                          style={inlineInputStyle}
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Note</label>
                                        <input
                                          type="text"
                                          value={refundForm.note}
                                          onChange={e => setRefundForm(f => ({ ...f, note: e.target.value }))}
                                          style={inlineInputStyle}
                                        />
                                      </div>
                                    </div>
                                    {refundError && <p className="text-red-500 text-xs mb-2">{refundError}</p>}
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleRefundConfirm(p)}
                                        disabled={refundSaving}
                                        style={{ ...destructiveBtnStyle, minHeight: '36px', padding: '6px 14px', opacity: refundSaving ? 0.6 : 1 }}
                                      >
                                        {refundSaving ? 'Processing...' : 'Confirm Refund'}
                                      </button>
                                      <button onClick={() => setRefundingId(null)} style={{ ...cancelBtnStyle, minHeight: '36px', padding: '6px 14px' }}>
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Fragment>
                          ))}

                          {/* Show more */}
                          {group.purchases.length > visible && (
                            <div className="px-3 py-3 text-center">
                              <button
                                onClick={() => showMoreGroup(group.productName)}
                                style={{ color: '#1A2C4E', background: 'none', border: '1px solid #d1d5db', padding: '6px 16px', borderRadius: 0, cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                              >
                                Show {Math.min(PAGE_SIZE, group.purchases.length - visible)} more
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ATTENDANCE TAB ─────────────────────────────────────────────── */}
        {activeTab === 'Attendance' && (
          <div>
            {attendanceCount === 0 ? (
              <p className="text-gray-400 text-sm">No attendance recorded.</p>
            ) : (
              <>
                <p className="text-sm mb-4" style={{ color: '#1A2C4E' }}>
                  <span className="font-bold">{attendanceCount}</span> classes attended. Last attended:{' '}
                  <span className="font-bold">{formatDate(lastAttendance)}</span>.
                </p>

                <div className="hidden md:block">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[#e5e7eb]">
                        {['Date', 'Class Name', 'Pass Used'].map(h => (
                          <th key={h} className="text-left uppercase tracking-wide pb-3 pr-4 text-[11px]" style={{ color: '#6b7280' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map(a => (
                        <tr key={a.id} className="border-b border-[#f3f4f6]">
                          <td className="py-3 pr-4 text-sm text-gray-500">{formatDate(a.class_date)}</td>
                          <td className="py-3 pr-4 text-sm font-medium" style={{ color: '#1A2C4E' }}>{a.class_name}</td>
                          <td className="py-3 text-sm text-gray-500">{a.pass_used ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden space-y-3">
                  {attendance.map(a => (
                    <div key={a.id} className="border border-[#e5e7eb] p-3" style={{ borderRadius: 0 }}>
                      <p className="font-medium text-sm" style={{ color: '#1A2C4E' }}>{a.class_name}</p>
                      <p className="text-gray-400 text-xs mt-1">{formatDate(a.class_date)}</p>
                      {a.pass_used && <p className="text-gray-500 text-xs mt-0.5">{a.pass_used}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── LEAD HISTORY TAB ───────────────────────────────────────────── */}
        {activeTab === 'Lead History' && (
          <div>
            {leads.length === 0 ? (
              <p className="text-gray-400 text-sm">No lead history.</p>
            ) : (
              <>
                <div className="hidden md:block">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[#e5e7eb]">
                        {['Date Added', 'Product', 'Status', 'Assigned To', 'Last Follow-up', 'Notes'].map(h => (
                          <th key={h} className="text-left uppercase tracking-wide pb-3 pr-4 text-[11px]" style={{ color: '#6b7280' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map(l => (
                        <tr key={l.id} className="border-b border-[#f3f4f6]">
                          <td className="py-3 pr-4 text-sm text-gray-500">{formatDate(l.date_added)}</td>
                          <td className="py-3 pr-4 text-sm font-medium" style={{ color: '#1A2C4E' }}>{l.product_name ?? '—'}</td>
                          <td className="py-3 pr-4"><StatusBadge status={l.status} type="lead" /></td>
                          <td className="py-3 pr-4 text-sm">{l.assigned_to}</td>
                          <td className="py-3 pr-4 text-sm text-gray-500">{formatDate(l.last_followup_date)}</td>
                          <td className="py-3 text-sm text-gray-500">{l.notes ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden space-y-3">
                  {leads.map(l => (
                    <div key={l.id} className="border border-[#e5e7eb] p-3" style={{ borderRadius: 0 }}>
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm" style={{ color: '#1A2C4E' }}>{l.product_name ?? '—'}</p>
                        <StatusBadge status={l.status} type="lead" />
                      </div>
                      <p className="text-gray-400 text-xs mt-1">Added: {formatDate(l.date_added)}</p>
                      <p className="text-gray-400 text-xs">Follow-up: {formatDate(l.last_followup_date)}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── INTERESTS TAB ──────────────────────────────────────────────── */}
        {activeTab === 'Interests' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold" style={{ color: '#1A2C4E' }}>Interests</p>
              <button
                onClick={openAddInterestForm}
                className="font-semibold text-white text-sm"
                style={{ ...amberBtnStyle, padding: '8px 14px', minHeight: '36px' }}
              >
                Add interest
              </button>
            </div>

            {/* Add interest form */}
            {showAddInterestForm && (
              <div className="border border-[#e5e7eb] p-4 mb-4" style={{ background: '#f9fafb' }}>
                <p className="font-medium text-sm mb-3" style={{ color: '#1A2C4E' }}>New Interest</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Product *</label>
                    <ProductSelect
                      value={addInterestForm.product_id}
                      onChange={v => setAddInterestForm(f => ({ ...f, product_id: v }))}
                      grouped={groupedProducts}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Source</label>
                    <input
                      type="text"
                      placeholder="How did this come up? e.g. completed 60hr, asked at retreat"
                      value={addInterestForm.source}
                      onChange={e => setAddInterestForm(f => ({ ...f, source: e.target.value }))}
                      style={formInputStyle}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Notes</label>
                    <textarea
                      value={addInterestForm.notes}
                      onChange={e => setAddInterestForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      style={{ ...formInputStyle, resize: 'vertical' }}
                    />
                  </div>
                </div>
                {addInterestError && <p className="text-red-500 text-xs mb-2">{addInterestError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleAddInterest}
                    disabled={addInterestSaving}
                    style={{ ...amberBtnStyle, opacity: addInterestSaving ? 0.6 : 1 }}
                  >
                    {addInterestSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => { setShowAddInterestForm(false); setAddInterestError(null) }} style={cancelBtnStyle}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {interests === null ? (
              <p className="text-gray-400 text-sm">Loading...</p>
            ) : interests.length === 0 ? (
              <p className="text-gray-400 text-sm">No interests recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {interests.map(interest => (
                  <div
                    key={interest.id}
                    className="flex items-center justify-between border border-[#e5e7eb] p-3"
                    style={{ borderRadius: 0 }}
                  >
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm" style={{ color: '#1A2C4E' }}>{interest.product_name}</span>
                        <StatusBadge status={interest.category} type="person" />
                      </div>
                      <div className="flex items-center gap-3 flex-wrap mt-0.5">
                        {interest.source && <span className="text-xs text-gray-500">{interest.source}</span>}
                        <span className="text-xs text-gray-400">{formatDate(interest.added_date)}</span>
                        <span className="text-xs text-gray-400">{interest.added_by}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveInterest(interest.id)}
                      style={{
                        background: 'none',
                        border: '1px solid #d1d5db',
                        padding: '4px 10px',
                        borderRadius: 0,
                        cursor: 'pointer',
                        color: '#374151',
                        fontSize: '12px',
                        minHeight: '32px',
                        flexShrink: 0,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

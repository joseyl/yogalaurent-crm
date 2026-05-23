'use client'

import { Fragment, useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Edit2, Archive, ArchiveRestore, X } from 'lucide-react'
import { categoryLabel } from '@/lib/utils'

interface Product {
  id: string
  name: string
  base_name: string | null
  year: number | null
  category: string
  entity: string
  created_at: string
  archived: boolean
}

const ENTITIES = ['Laurent Roure', 'Terra Training Ltd'] as const

function entityAbbr(entity: string): string {
  if (entity === 'Laurent Roure') return 'LR'
  if (entity === 'Terra Training Ltd') return 'TTL'
  return entity
}

const PRODUCT_CATEGORIES = ['training', 'retreat', 'workshop', 'classes', 'private', 'other'] as const

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const inputStyle: React.CSSProperties = {
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

const iconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '5px',
  cursor: 'pointer',
  color: '#6b7280',
  display: 'flex',
  alignItems: 'center',
  borderRadius: 2,
}

const emptyAddForm = { name: '', category: 'classes', entity: 'Laurent Roure', destination: '', year: '' }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState(emptyAddForm)
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', category: '', entity: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [showArchived, setShowArchived] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/products?all=true')
      .then(r => r.json())
      .then((data: Product[]) => {
        if (!cancelled) { setProducts(data); setLoading(false) }
      })
      .catch(() => {
        if (!cancelled) { setFetchError('Failed to load products.'); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [])

  const active = products.filter(p => !p.archived)
  const archived = products.filter(p => p.archived)
  const searchedActive = searchQuery.trim()
    ? active.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : active

  async function handleAdd() {
    const isRetreat = addForm.category === 'retreat'
    let name: string
    let base_name: string
    let year: number | null = null

    if (isRetreat) {
      if (!addForm.destination.trim()) { setAddError('Destination is required.'); return }
      const yr = parseInt(addForm.year, 10)
      if (!addForm.year || isNaN(yr)) { setAddError('Year is required.'); return }
      name = `${addForm.destination.trim()} ${yr}`
      base_name = addForm.destination.trim()
      year = yr
    } else {
      if (!addForm.name.trim()) { setAddError('Name is required.'); return }
      name = addForm.name.trim()
      base_name = addForm.name.trim()
    }

    setAddSaving(true)
    setAddError(null)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category: addForm.category, entity: addForm.entity, base_name, year }),
      })
      const data = await res.json() as { id?: string; error?: string }
      if (!res.ok) { setAddError(data.error ?? 'Failed to add.'); setAddSaving(false); return }
      const newProduct: Product = {
        id: data.id!,
        name,
        base_name,
        year,
        category: addForm.category,
        entity: addForm.entity,
        created_at: new Date().toISOString(),
        archived: false,
      }
      setProducts(prev =>
        [...prev, newProduct].sort((a, b) =>
          a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
        )
      )
      setAddForm(emptyAddForm)
      setShowAddForm(false)
    } catch {
      setAddError('Network error.')
    } finally {
      setAddSaving(false)
    }
  }

  function startEdit(p: Product) {
    setEditingId(p.id)
    setEditForm({ name: p.name, category: p.category, entity: p.entity })
    setEditError(null)
  }

  async function handleEditSave(id: string) {
    if (!editForm.name.trim()) { setEditError('Name is required.'); return }
    setEditSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editForm.name.trim(), category: editForm.category, entity: editForm.entity }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setEditError(data.error ?? 'Failed to save.')
        setEditSaving(false)
        return
      }
      setProducts(prev =>
        prev.map(p => p.id === id ? { ...p, name: editForm.name.trim(), category: editForm.category, entity: editForm.entity } : p)
      )
      setEditingId(null)
    } catch {
      setEditError('Network error.')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleArchive(id: string, archive: boolean) {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: archive }),
      })
      if (!res.ok) return
      setProducts(prev => prev.map(p => p.id === id ? { ...p, archived: archive } : p))
    } catch {
      // silent
    }
  }

  function renderEditRow(p: Product) {
    return (
      <tr key={p.id} className="border-b border-[#f3f4f6]" style={{ background: '#fffbf0' }}>
        <td className="px-4 py-2">
          <input
            type="text"
            value={editForm.name}
            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
            style={inlineInputStyle}
            autoFocus
          />
          {editError && <p className="text-red-500 text-xs mt-1">{editError}</p>}
        </td>
        <td className="px-4 py-2">
          <select
            value={editForm.category}
            onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
            style={inlineInputStyle}
          >
            {PRODUCT_CATEGORIES.map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <select
            value={editForm.entity}
            onChange={e => setEditForm(f => ({ ...f, entity: e.target.value }))}
            style={{ ...inlineInputStyle, marginTop: '6px' }}
          >
            {ENTITIES.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-2 hidden md:table-cell"></td>
        <td className="px-4 py-2">
          <div className="flex gap-2">
            <button onClick={() => handleEditSave(p.id)} disabled={editSaving} className="btn-primary">
              {editSaving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setEditingId(null)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </td>
      </tr>
    )
  }

  function renderDisplayRow(p: Product, linkLabel?: string) {
    return (
      <tr key={p.id} className="border-b border-[#f3f4f6]">
        <td className="px-4 py-3 text-sm font-medium" style={{ color: '#1A2C4E' }}>
          <Link href={`/products/${p.id}`} className="hover:underline">{linkLabel ?? p.name}</Link>
        </td>
        <td className="px-4 py-3">
          <span style={{ background: '#f3f4f6', color: '#374151', padding: '2px 6px', fontSize: '11px', fontWeight: 500, borderRadius: '4px' }}>{entityAbbr(p.entity)}</span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{formatDate(p.created_at)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 justify-end">
            <button onClick={() => startEdit(p)} style={iconBtnStyle} title="Edit">
              <Edit2 size={14} />
            </button>
            <button onClick={() => handleArchive(p.id, true)} style={iconBtnStyle} title="Archive">
              <Archive size={14} />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  if (loading) {
    return <div className="px-6 pt-6 text-sm text-gray-500">Loading...</div>
  }

  if (fetchError) {
    return <div className="px-6 pt-6 text-sm text-red-500">{fetchError}</div>
  }

  return (
    <div className="pb-24 max-w-3xl">
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <h1 className="font-bold" style={{ fontSize: '22px', color: '#1A2C4E' }}>Products</h1>
        <button
          onClick={() => { setShowAddForm(true); setAddError(null); setAddForm(emptyAddForm) }}
          className="btn-primary"
        >
          <Plus size={15} />
          Add Product
        </button>
      </div>

      <div className="px-6">
        {/* Add form */}
        {showAddForm && (
          <div className="border border-[#e5e7eb] p-4 mb-4" style={{ background: '#f9fafb' }}>
            <p className="font-medium text-sm mb-3" style={{ color: '#1A2C4E' }}>New Product</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              {addForm.category === 'retreat' ? (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Destination *</label>
                    <input
                      type="text"
                      placeholder="e.g. East Sussex, UK"
                      value={addForm.destination}
                      onChange={e => setAddForm(f => ({ ...f, destination: e.target.value }))}
                      style={inputStyle}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Year *</label>
                    <input
                      type="number"
                      placeholder="e.g. 2026"
                      min={2020}
                      max={2040}
                      value={addForm.year}
                      onChange={e => setAddForm(f => ({ ...f, year: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name *</label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                    style={inputStyle}
                    autoFocus
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Category *</label>
                <select
                  value={addForm.category}
                  onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
                  style={inputStyle}
                >
                  {PRODUCT_CATEGORIES.map(c => (
                    <option key={c} value={c}>{categoryLabel(c)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Entity *</label>
                <select
                  value={addForm.entity}
                  onChange={e => setAddForm(f => ({ ...f, entity: e.target.value }))}
                  style={inputStyle}
                >
                  {ENTITIES.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
            </div>
            {addError && <p className="text-red-500 text-xs mb-2">{addError}</p>}
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={addSaving} className="btn-primary">
                {addSaving ? 'Saving...' : 'Add Product'}
              </button>
              <button onClick={() => { setShowAddForm(false); setAddError(null) }} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        {active.length > 0 && (
          <div className="mb-4 relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, paddingRight: searchQuery ? '40px' : '10px' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', padding: '4px' }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Active products grouped by category */}
        {active.length === 0 && !showAddForm ? (
          <p className="text-sm text-gray-400">No products yet. Add one above.</p>
        ) : searchedActive.length === 0 ? (
          <p className="text-sm text-gray-400">No products found.</p>
        ) : (
          <div className="space-y-6">
            {PRODUCT_CATEGORIES.map(cat => {
              const catProducts = searchedActive.filter(p => p.category === cat)
              if (catProducts.length === 0) return null

              if (cat === 'retreat') {
                // Group by base_name, sort each group by year descending
                const groupMap = new Map<string, Product[]>()
                for (const p of catProducts) {
                  const key = p.base_name ?? p.name
                  if (!groupMap.has(key)) groupMap.set(key, [])
                  groupMap.get(key)!.push(p)
                }
                for (const items of groupMap.values()) {
                  items.sort((a, b) => (b.year ?? -Infinity) - (a.year ?? -Infinity))
                }
                return (
                  <div key={cat}>
                    <h2 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#1A2C4E' }}>
                      {categoryLabel(cat)}
                    </h2>
                    <div className="border border-[#e5e7eb]">
                      <table className="w-full border-collapse">
                        <tbody>
                          {Array.from(groupMap.entries()).map(([baseName, items]) => (
                            <Fragment key={baseName}>
                              <tr className="border-b border-[#e5e7eb]" style={{ background: '#f9fafb' }}>
                                <td colSpan={4} className="px-4 py-2 text-xs font-semibold" style={{ color: '#6b7280' }}>
                                  {baseName}
                                </td>
                              </tr>
                              {items.map(p => (
                                editingId === p.id
                                  ? renderEditRow(p)
                                  : renderDisplayRow(p, p.year != null ? String(p.year) : p.name)
                              ))}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              }

              return (
                <div key={cat}>
                  <h2
                    className="text-sm font-semibold uppercase tracking-wide mb-2"
                    style={{ color: '#1A2C4E' }}
                  >
                    {categoryLabel(cat)}
                  </h2>
                  <div className="border border-[#e5e7eb]">
                    <table className="w-full border-collapse">
                      <tbody>
                        {catProducts.map(p => (
                          editingId === p.id ? renderEditRow(p) : renderDisplayRow(p)
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Archived section */}
        {archived.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setShowArchived(v => !v)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                style={{ transform: showArchived ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
              >
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Archived products ({archived.length})
            </button>

            {showArchived && (
              <div className="border border-[#e5e7eb] mt-3">
                <table className="w-full border-collapse">
                  <tbody>
                    {archived.map(p => (
                      <tr key={p.id} className="border-b border-[#f3f4f6]">
                        <td className="px-4 py-3 text-sm text-gray-400">{p.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{p.category}</td>
                        <td className="px-4 py-3">
                          <span style={{ background: '#f3f4f6', color: '#374151', padding: '2px 6px', fontSize: '11px', fontWeight: 500, borderRadius: '4px' }}>{entityAbbr(p.entity)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleArchive(p.id, false)} className="btn-secondary text-xs">
                            <ArchiveRestore size={12} />
                            Unarchive
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Archive, ArchiveRestore } from 'lucide-react'

interface Product {
  id: string
  name: string
  category: string
  created_at: string
  archived: boolean
}

const PRODUCT_CATEGORIES = ['classes', 'training', 'retreat', 'workshop', 'private', 'other'] as const

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', category: 'classes' })
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', category: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [showArchived, setShowArchived] = useState(false)

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

  async function handleAdd() {
    if (!addForm.name.trim()) { setAddError('Name is required.'); return }
    setAddSaving(true)
    setAddError(null)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addForm.name.trim(), category: addForm.category }),
      })
      const data = await res.json() as { id?: string; error?: string }
      if (!res.ok) { setAddError(data.error ?? 'Failed to add.'); setAddSaving(false); return }
      const newProduct: Product = {
        id: data.id!,
        name: addForm.name.trim(),
        category: addForm.category,
        created_at: new Date().toISOString(),
        archived: false,
      }
      setProducts(prev =>
        [...prev, newProduct].sort((a, b) =>
          a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
        )
      )
      setAddForm({ name: '', category: 'classes' })
      setShowAddForm(false)
    } catch {
      setAddError('Network error.')
    } finally {
      setAddSaving(false)
    }
  }

  function startEdit(p: Product) {
    setEditingId(p.id)
    setEditForm({ name: p.name, category: p.category })
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
        body: JSON.stringify({ name: editForm.name.trim(), category: editForm.category }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setEditError(data.error ?? 'Failed to save.')
        setEditSaving(false)
        return
      }
      setProducts(prev =>
        prev.map(p => p.id === id ? { ...p, name: editForm.name.trim(), category: editForm.category } : p)
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
          onClick={() => { setShowAddForm(true); setAddError(null); setAddForm({ name: '', category: 'classes' }) }}
          className="flex items-center gap-2 font-semibold text-white text-sm"
          style={{ background: '#1A2C4E', padding: '10px 16px', minHeight: '44px', borderRadius: 0, border: 'none', cursor: 'pointer' }}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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
              <div>
                <label className="block text-xs text-gray-500 mb-1">Category *</label>
                <select
                  value={addForm.category}
                  onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
                  style={inputStyle}
                >
                  {PRODUCT_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            {addError && <p className="text-red-500 text-xs mb-2">{addError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={addSaving}
                className="font-semibold text-white text-sm"
                style={{ background: addSaving ? '#9ca3af' : '#1A2C4E', padding: '10px 16px', minHeight: '44px', borderRadius: 0, border: 'none', cursor: addSaving ? 'not-allowed' : 'pointer' }}
              >
                {addSaving ? 'Saving...' : 'Add Product'}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setAddError(null) }}
                className="font-medium text-sm"
                style={{ background: 'none', border: '1px solid #d1d5db', padding: '10px 16px', minHeight: '44px', borderRadius: 0, cursor: 'pointer', color: '#374151' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Active products grouped by category */}
        {active.length === 0 && !showAddForm ? (
          <p className="text-sm text-gray-400">No products yet. Add one above.</p>
        ) : (
          <div className="space-y-6">
            {PRODUCT_CATEGORIES.map(cat => {
              const catProducts = active.filter(p => p.category === cat)
              if (catProducts.length === 0) return null
              return (
                <div key={cat}>
                  <h2
                    className="text-sm font-semibold uppercase tracking-wide mb-2"
                    style={{ color: '#1A2C4E' }}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </h2>
                  <div className="border border-[#e5e7eb]">
                    <table className="w-full border-collapse">
                      <tbody>
                        {catProducts.map(p => (
                          editingId === p.id ? (
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
                              </td>
                              <td className="px-4 py-2 hidden md:table-cell"></td>
                              <td className="px-4 py-2">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditSave(p.id)}
                                    disabled={editSaving}
                                    style={{ background: '#1A2C4E', color: 'white', border: 'none', padding: '5px 10px', fontSize: '12px', fontWeight: 600, borderRadius: 0, cursor: editSaving ? 'not-allowed' : 'pointer' }}
                                  >
                                    {editSaving ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    style={{ background: 'none', color: '#374151', border: '1px solid #d1d5db', padding: '5px 10px', fontSize: '12px', borderRadius: 0, cursor: 'pointer' }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <tr key={p.id} className="border-b border-[#f3f4f6]">
                              <td className="px-4 py-3 text-sm font-medium" style={{ color: '#1A2C4E' }}>{p.name}</td>
                              <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{formatDate(p.created_at)}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 justify-end">
                                  <button
                                    onClick={() => startEdit(p)}
                                    style={{ background: 'none', border: 'none', padding: '5px', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', borderRadius: 2 }}
                                    title="Edit"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleArchive(p.id, true)}
                                    style={{ background: 'none', border: 'none', padding: '5px', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', borderRadius: 2 }}
                                    title="Archive"
                                  >
                                    <Archive size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
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
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleArchive(p.id, false)}
                            className="flex items-center gap-1.5 text-xs font-medium"
                            style={{ background: 'none', border: '1px solid #d1d5db', padding: '5px 10px', borderRadius: 0, cursor: 'pointer', color: '#374151' }}
                          >
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

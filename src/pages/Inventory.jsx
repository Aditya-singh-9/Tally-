import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Search, Plus, Pencil, Trash2, X, Package } from 'lucide-react'

const CATEGORIES = ['Sunmica']
const fmt = n => new Intl.NumberFormat('en-IN').format(n)

function StockLevel({ qty, threshold }) {
  const pct = Math.min(100, (qty / (threshold * 3)) * 100)
  const color = qty === 0 ? 'var(--red)' : qty <= threshold ? 'var(--yellow)' : 'var(--green)'
  return (
    <div>
      <span style={{ fontWeight: 700, color }}>{qty}</span>
      <div className="stock-bar-wrap" style={{ width: 60 }}>
        <div className="stock-bar" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState(product || {
    name: '', hsn_sac: '39209919', category: 'Sunmica',
    price: '', gst_rate: 18, quantity: '', low_stock_threshold: 20
  })
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.price || form.price <= 0) e.price = 'Valid price required'
    if (form.quantity === '' || form.quantity < 0) e.quantity = 'Valid quantity required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    if (!validate()) return
    onSave({
      ...form,
      price: parseFloat(form.price),
      gst_rate: parseFloat(form.gst_rate),
      quantity: parseInt(form.quantity),
      low_stock_threshold: parseInt(form.low_stock_threshold) || 20,
    })
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{product ? 'Edit Product' : 'Add New Product'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input id="prod-name" className={`form-input ${errors.name ? 'input-error' : ''}`}
                value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. 1220X2440X0.72 MM DELUXE" autoFocus />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            <div className="grid grid-2 gap-3">
              <div className="form-group">
                <label className="form-label">HSN / SAC Code</label>
                <input id="prod-hsn" className="form-input" value={form.hsn_sac}
                  onChange={e => set('hsn_sac', e.target.value)} placeholder="48239019" />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select id="prod-category" className="form-select" value={form.category}
                  onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-3 gap-3">
              <div className="form-group">
                <label className="form-label">Price (₹) *</label>
                <input id="prod-price" className={`form-input ${errors.price ? 'input-error' : ''}`}
                  type="number" step="0.01" min="0"
                  value={form.price} onChange={e => set('price', e.target.value)}
                  placeholder="0.00" />
                {errors.price && <span className="form-error">{errors.price}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">GST Rate (%)</label>
                <select id="prod-gst" className="form-select" value={form.gst_rate}
                  onChange={e => set('gst_rate', e.target.value)}>
                  {[0, 5, 12, 18, 28].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Stock Qty *</label>
                <input id="prod-qty" className={`form-input ${errors.quantity ? 'input-error' : ''}`}
                  type="number" min="0"
                  value={form.quantity} onChange={e => set('quantity', e.target.value)}
                  placeholder="0" />
                {errors.quantity && <span className="form-error">{errors.quantity}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Low Stock Alert Threshold</label>
              <input id="prod-threshold" className="form-input" type="number" min="0"
                value={form.low_stock_threshold}
                onChange={e => set('low_stock_threshold', e.target.value)}
                placeholder="20" />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                You'll be alerted when stock falls below this number.
              </span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button id="prod-save" type="submit" className="btn btn-primary">
              {product ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Inventory() {
  const { products, addProduct, updateProduct, deleteProduct } = useApp()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [editProduct, setEditProduct] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const categories = ['All', ...CATEGORIES]

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.hsn_sac?.toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  const lowStock = products.filter(p => p.quantity <= p.low_stock_threshold).length
  const outOfStock = products.filter(p => p.quantity === 0).length

  function handleSave(data) {
    if (editProduct) {
      updateProduct(editProduct.id, data)
      setEditProduct(null)
    } else {
      addProduct(data)
      setShowAdd(false)
    }
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div>
          <h1>Inventory</h1>
          <p>{products.length} products · {lowStock > 0 && <span style={{ color: 'var(--yellow)' }}>{lowStock} low stock</span>}{outOfStock > 0 && <span style={{ color: 'var(--red)', marginLeft: 8 }}>{outOfStock} out of stock</span>}</p>
        </div>
        <button id="add-product-btn" className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Product
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-4 gap-4 mb-6">
        {[
          { label: 'Total Products', value: products.length, color: 'var(--accent-light)' },
          { label: 'In Stock', value: products.filter(p => p.quantity > p.low_stock_threshold).length, color: 'var(--green)' },
          { label: 'Low Stock', value: lowStock, color: 'var(--yellow)' },
          { label: 'Out of Stock', value: outOfStock, color: 'var(--red)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-row mb-4">
        <div className="search-bar" style={{ flex: 1, maxWidth: 320 }}>
          <Search size={15} />
          <input id="inventory-search" className="form-input" placeholder="Search Sunmica products..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>HSN/SAC</th>
              <th>Category</th>
              <th className="num">Price (₹)</th>
              <th className="num">GST %</th>
              <th className="num">Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <Package size={36} />
                  <h3>No products found</h3>
                  <p>Try adjusting your search or add a new product.</p>
                </div>
              </td></tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{p.name}</div>
                  {p.quantity <= p.low_stock_threshold && (
                    <span className={`badge ${p.quantity === 0 ? 'badge-red' : 'badge-yellow'}`} style={{ marginTop: 3 }}>
                      {p.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                    </span>
                  )}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{p.hsn_sac || '—'}</td>
                <td><span className="badge badge-purple">{p.category}</span></td>
                <td className="num">₹{fmt(p.price)}</td>
                <td className="num">{p.gst_rate}%</td>
                <td><StockLevel qty={p.quantity} threshold={p.low_stock_threshold} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      data-tooltip="Edit"
                      onClick={() => setEditProduct(p)}
                    ><Pencil size={14} /></button>
                    <button
                      className="btn btn-danger btn-icon btn-sm"
                      data-tooltip="Delete"
                      onClick={() => setDeleteId(p.id)}
                    ><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {(showAdd || editProduct) && (
        <ProductModal
          product={editProduct}
          onClose={() => { setShowAdd(false); setEditProduct(null) }}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h2>Delete Product?</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setDeleteId(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                This will permanently delete the product. This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button id="confirm-delete" className="btn btn-danger" onClick={() => { deleteProduct(deleteId); setDeleteId(null) }}>
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { Plus, Trash2, Save, Search, RotateCcw } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)
const today = () => new Date().toISOString().split('T')[0]

function emptyItem() {
  return {
    _key: Date.now() + Math.random(),
    product_id: '',
    product_name: '',
    hsn_sac: '',       
    gst_rate: 18,      
    quantity: '',
    rate: '',          
    discount_pct: '',
    amount: 0,
  }
}

export default function Purchases({ onNavigate }) {
  const { products, parties, addParty, createPurchase, purchases } = useApp()

  const [date, setDate] = useState(today())
  const [supplierInput, setSupplierInput] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [showSuppDropdown, setShowSuppDropdown] = useState(false)
  const [items, setItems] = useState([emptyItem()])
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  // ── Supplier autocomplete ───────────────────────────────────
  const suppMatches = (parties || []).filter(c =>
    c.type === 'supplier' &&
    supplierInput.length > 0 &&
    c.name.toLowerCase().includes(supplierInput.toLowerCase())
  )

  function selectSupplier(c) {
    setSupplierId(c.id)
    setSupplierInput(c.name)
    setShowSuppDropdown(false)
  }

  // ── Line item helpers ───────────────────────────────────────
  function calcAmount(rate, qty, discountPct, gstRate) {
    const base = parseFloat(rate || 0) * parseFloat(qty || 0)
    const discount = base * (parseFloat(discountPct || 0) / 100)
    const taxable = base - discount
    return parseFloat((taxable + taxable * (parseFloat(gstRate || 0) / 100)).toFixed(2))
  }

  function selectProduct(idx, prod) {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      // For purchases, default rate is the current selling price, but usually they edit this.
      const rate = prod.price 
      const qty = it.quantity || 1
      const disc = it.discount_pct || 0
      return {
        ...it,
        product_id: prod.id,
        product_name: prod.name,
        hsn_sac: prod.hsn_sac || '',
        gst_rate: prod.gst_rate,
        rate: rate,
        quantity: qty,
        amount: calcAmount(rate, qty, disc, prod.gst_rate),
      }
    }))
  }

  function updateItem(idx, changes) {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const merged = { ...it, ...changes }
      merged.amount = calcAmount(merged.rate, merged.quantity, merged.discount_pct, merged.gst_rate)
      return merged
    }))
  }

  function addItem() { setItems(prev => [...prev, emptyItem()]) }
  function removeItem(idx) {
    if (items.length === 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Totals ──────────────────────────────────────────────────
  const subtotal = items.reduce((s, it) => {
    const base = parseFloat(it.rate || 0) * parseFloat(it.quantity || 0)
    const discount = base * (parseFloat(it.discount_pct || 0) / 100)
    return s + (base - discount)
  }, 0)

  const totalGst = items.reduce((s, it) => {
    const base = parseFloat(it.rate || 0) * parseFloat(it.quantity || 0)
    const discount = base * (parseFloat(it.discount_pct || 0) / 100)
    const taxable = base - discount
    return s + taxable * (parseFloat(it.gst_rate || 0) / 100)
  }, 0)

  const grandTotal = parseFloat((subtotal + totalGst).toFixed(2))
  const grandTotalRounded = Math.round(grandTotal)
  const roundOff = parseFloat((grandTotalRounded - grandTotal).toFixed(2))

  // ── Validation ──────────────────────────────────────────────
  function validate() {
    if (!supplierInput.trim() || !supplierId) {
      alert('Please select a valid supplier from the list (or create one in Parties).')
      return false
    }
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.product_name.trim()) {
        alert(`Row ${i + 1}: Please select a product.`)
        return false
      }
      if (!it.quantity || parseFloat(it.quantity) <= 0) {
        alert(`Row ${i + 1}: Please enter a valid quantity.`)
        return false
      }
      if (!it.rate || parseFloat(it.rate) <= 0) {
        alert(`Row ${i + 1}: Please enter a valid purchase rate.`)
        return false
      }
    }
    return true
  }

  // ── Save ────────────────────────────────────────────────────
  async function handleSave() {
    if (!validate()) return

    try {
      let finalPartyId = supplierId
      if (!finalPartyId && supplierInput) {
        const newParty = await addParty({
          type: 'supplier',
          name: supplierInput,
        })
        finalPartyId = newParty.id
      }

      const purchaseData = {
        status: 'completed',
        party_id: finalPartyId,
        party_name: supplierInput,
        date,
        subtotal,
        total_gst: totalGst,
        grand_total: grandTotalRounded,
        round_off: roundOff,
        notes,
        items: items.filter(it => it.product_name && it.quantity && it.rate).map(it => ({
          id: 'pi_' + Date.now() + Math.random(),
          product_id: it.product_id,
          product_name: it.product_name,
          hsn_sac: it.hsn_sac,
          quantity: parseFloat(it.quantity),
          rate: parseFloat(it.rate),
          gst_rate: parseFloat(it.gst_rate),
          discount_pct: parseFloat(it.discount_pct || 0),
          amount: it.amount,
        }))
      }

      await createPurchase(purchaseData)
      setSaved(true)
      setTimeout(() => handleReset(), 3000)
    } catch (e) {
      alert('Error saving purchase: ' + e.message)
    }
  }

  function handleReset() {
    setSupplierInput(''); setSupplierId('')
    setItems([emptyItem()]); setNotes(''); setSaved(false)
    setDate(today())
  }

  const getMatches = (name) => products.filter(p =>
    name.length > 0 && p.name.toLowerCase().includes(name.toLowerCase())
  )

  return (
    <div>
      <div className="page-header flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div>
          <h1>Record Purchase (Inward)</h1>
          <p>This will increase your stock and reflect in the supplier's ledger.</p>
        </div>
      </div>

      {saved && (
        <div style={{ background: 'var(--green-bg)', color: 'var(--green)', padding: '12px 16px', borderRadius: 8, marginBottom: 20, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          ✅ Purchase created successfully! Stock has been updated. Resetting form...
        </div>
      )}

      {/* ── SUPPLIER + DATE ROW ── */}
      <div className="card mb-4">
        <div className="card-title">Supplier Details</div>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) 200px' }}>

          <div className="form-group">
            <label className="form-label">Supplier Name *</label>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                className="form-input"
                placeholder="Search supplier..."
                value={supplierInput}
                style={{ paddingLeft: 30 }}
                onChange={e => { setSupplierInput(e.target.value); setShowSuppDropdown(true); setSupplierId('') }}
                onFocus={() => setShowSuppDropdown(true)}
                onBlur={() => setTimeout(() => setShowSuppDropdown(false), 200)}
                autoFocus
              />
              {showSuppDropdown && suppMatches.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', zIndex: 100, marginTop: 4,
                  boxShadow: 'var(--shadow-md)', maxHeight: 200, overflowY: 'auto',
                }}>
                  {suppMatches.map(c => (
                    <div key={c.id}
                      style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                      onMouseDown={() => selectSupplier(c)}
                      className="sidebar-link">
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                      {c.gstin && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>GSTIN: {c.gstin}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Purchase Date</label>
            <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── PRODUCT LINE ITEMS ── */}
      <div className="card mb-4">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="card-title" style={{ margin: 0 }}>Products Received</div>
          <button className="btn btn-secondary btn-sm" onClick={addItem}>
            <Plus size={13} /> Add Row
          </button>
        </div>

        <table className="line-items-table" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 36 }} />        {/* Sr */}
            <col style={{ width: '38%' }} />      {/* Product */}
            <col style={{ width: '13%' }} />      {/* Qty */}
            <col style={{ width: '15%' }} />      {/* Purchase Rate */}
            <col style={{ width: '12%' }} />      {/* Discount */}
            <col style={{ width: '18%' }} />      {/* Amount */}
            <col style={{ width: 36 }} />         {/* Delete */}
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'center' }}>Sr</th>
              <th>Product Name</th>
              <th>Qty Recv</th>
              <th>Purch. Rate (₹)</th>
              <th>Disc (%)</th>
              <th style={{ textAlign: 'right' }}>Amount (₹)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const matches = getMatches(it.product_name)

              return (
                <tr key={it._key}>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>{idx + 1}</td>
                  <td style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      placeholder="Type to search product..."
                      value={it.product_name}
                      onChange={e => updateItem(idx, { product_name: e.target.value, product_id: '' })}
                    />
                    {it.product_name && !it.product_id && matches.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 80,
                        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)', marginTop: 2, boxShadow: 'var(--shadow-md)',
                        maxHeight: 200, overflowY: 'auto',
                      }}>
                        {matches.map(p => (
                          <div key={p.id}
                            style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                            onMouseDown={() => selectProduct(idx, p)}
                            className="sidebar-link"
                          >
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <input className="form-input" type="number" min="0.001" step="0.001" value={it.quantity} onChange={e => updateItem(idx, { quantity: e.target.value })} />
                  </td>
                  <td>
                    <input className="form-input" type="number" min="0" step="0.01" value={it.rate} onChange={e => updateItem(idx, { rate: e.target.value })} />
                  </td>
                  <td>
                    <input className="form-input" type="number" min="0" step="0.01" value={it.discount_pct} onChange={e => updateItem(idx, { discount_pct: e.target.value })} />
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: 8 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: it.amount > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {it.amount > 0 ? `₹${fmt(it.amount)}` : '—'}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => removeItem(idx)} disabled={items.length === 1}><Trash2 size={12} /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── TOTALS ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <div className="card" style={{ minWidth: 360 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Taxable Amount</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>₹{fmt(subtotal)}</span>
            </div>
            <div className="divider" style={{ margin: '2px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Input GST ({items[0]?.gst_rate || 18}%)</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>₹{fmt(totalGst)}</span>
            </div>
            {roundOff !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Round Off</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{roundOff >= 0 ? '' : '-'}₹{fmt(Math.abs(roundOff))}</span>
              </div>
            )}
            <div className="divider" style={{ margin: '2px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>Grand Total</span>
              <span style={{ fontWeight: 800, fontSize: 24, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                ₹{fmt(grandTotalRounded)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saved}><Save size={16} /> Save Purchase Vch</button>
      </div>
    </div>
  )
}

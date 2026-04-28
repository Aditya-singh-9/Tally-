import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { Plus, Trash2, Printer, Save, Search, RotateCcw } from 'lucide-react'
import InvoicePrint from '../components/PrintTemplate/InvoicePrint'
import ChallanPrint from '../components/PrintTemplate/ChallanPrint'

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

export default function Billing({ onNavigate }) {
  const { products, parties, addParty, createBill, profile, bills } = useApp()

  const [billType, setBillType] = useState('invoice')
  const [date, setDate] = useState(today())
  const [customerInput, setCustomerInput] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerGstin, setCustomerGstin] = useState('')
  const [placeOfSupply, setPlaceOfSupply] = useState('27-Maharashtra')
  const [customerId, setCustomerId] = useState('')
  const [showCustDropdown, setShowCustDropdown] = useState(false)
  const [items, setItems] = useState([emptyItem()])
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(null)
  const [showPrint, setShowPrint] = useState(false)
  const printRef = useRef()

  // ── Customer autocomplete ───────────────────────────────────
  const custMatches = (parties || []).filter(c =>
    c.type === 'customer' &&
    customerInput.length > 0 &&
    c.name.toLowerCase().includes(customerInput.toLowerCase())
  )

  function selectCustomer(c) {
    setCustomerId(c.id)
    setCustomerInput(c.name)
    setCustomerAddress(c.address)
    setCustomerGstin(c.gstin || '')
    setShowCustDropdown(false)
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
    if (!customerInput.trim()) {
      alert('Please enter customer name.')
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
        alert(`Row ${i + 1}: Please enter a valid rate.`)
        return false
      }
      // Stock check for invoices
      if (billType === 'invoice' && it.product_id) {
        const prod = products.find(p => p.id === it.product_id)
        if (prod && prod.quantity < parseFloat(it.quantity)) {
          alert(`Insufficient stock for "${prod.name}".\nAvailable: ${prod.quantity}`)
          return false
        }
      }
    }
    return true
  }

  // ── Save ────────────────────────────────────────────────────
  async function handleSave() {
    if (!validate()) return

    // ── CHALLAN: print-only, never saved to database ──────────
    if (billType === 'challan') {
      const challanItems = items
        .filter(it => it.product_name && it.quantity && it.rate)
        .map(it => ({
          id: 'ci_' + Date.now() + Math.random(),
          product_id: it.product_id,
          product_name: it.product_name,
          hsn_sac: it.hsn_sac,
          quantity: parseFloat(it.quantity),
          rate: parseFloat(it.rate),
          gst_rate: parseFloat(it.gst_rate),
          discount_pct: parseFloat(it.discount_pct || 0),
          amount: it.amount,
        }))

      // Generate a local challan number (max existing + 1, no DB write)
      const localNum = (bills.filter(b => b.type === 'challan')
        .reduce((m, b) => Math.max(m, b.bill_number), 0)) + 1

      const challanBill = {
        id: 'local_' + Date.now(),
        type: 'challan',
        bill_number: localNum,
        status: 'print_only',          // never stored
        customer_name: customerInput,
        customer_address: customerAddress,
        customer_gstin: customerGstin,
        place_of_supply: placeOfSupply,
        date,
        subtotal,
        total_gst: totalGst,
        grand_total: grandTotalRounded,
        round_off: roundOff,
        notes,
        items: challanItems,
      }

      setSaved(challanBill)
      setShowPrint(true)
      return  // ← exit here: no DB call, no stock deduction
    }

    // ── INVOICE: save to database as usual ────────────────────
    try {
      let finalPartyId = customerId
      if (!finalPartyId && customerInput) {
        const newParty = await addParty({
          type: 'customer',
          name: customerInput,
          address: customerAddress,
          gstin: customerGstin
        })
        finalPartyId = newParty.id
      }

      const billData = {
        type: 'invoice',
        status: 'completed',
        party_id: finalPartyId,
        customer_name: customerInput,
        customer_address: customerAddress,
        customer_gstin: customerGstin,
        place_of_supply: placeOfSupply,
        date,
        subtotal,
        total_gst: totalGst,
        grand_total: grandTotalRounded,
        round_off: roundOff,
        notes,
        items: items.filter(it => it.product_name && it.quantity && it.rate).map(it => ({
          id: 'bi_' + Date.now() + Math.random(),
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

      const bill = await createBill(billData)
      setSaved(bill)
      setShowPrint(true)
    } catch (e) {
      alert('Failed to save invoice: ' + e.message)
    }
  }

  function handleReset() {
    setCustomerInput(''); setCustomerAddress(''); setCustomerGstin('')
    setCustomerId(''); setPlaceOfSupply('27-Maharashtra')
    setItems([emptyItem()]); setNotes(''); setSaved(null)
    setShowPrint(false); setDate(today())
  }

  // ── Print view ──────────────────────────────────────────────
  if (showPrint && saved) {
    return (
      <div>
        <div className="no-print" style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={15} /> Print / Download PDF
          </button>
          <button className="btn btn-secondary" onClick={handleReset}>
            <Plus size={15} /> New Bill
          </button>
          <button className="btn btn-ghost" onClick={() => onNavigate('history')}>
            View Bill History
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: billType === 'invoice' ? 'var(--green)' : 'var(--yellow)' }}>
            {billType === 'invoice'
              ? `✓ Invoice #${String(saved.bill_number).padStart(3, '0')} saved!`
              : `🖨 Challan #${String(saved.bill_number).padStart(3, '0')} — Print only (not stored)`
            }
          </span>
        </div>

        <div ref={printRef} style={{
          background: '#fff',
          border: '1px solid #ddd',
          borderRadius: 4,
          maxWidth: 820,
        }}>
          {billType === 'invoice'
            ? <InvoicePrint bill={saved} profile={profile} />
            : <ChallanPrint bill={saved} profile={profile} />
          }
        </div>
      </div>
    )
  }

  const nextNum = (bills.filter(b => b.type === billType).reduce((m, b) => Math.max(m, b.bill_number), 0)) + 1

  // Product search matches for dropdown
  const getMatches = (name) => products.filter(p =>
    name.length > 0 && p.name.toLowerCase().includes(name.toLowerCase())
  )

  return (
    <div>
      <div className="page-header flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div>
          <h1>New Bill</h1>
          <p>
            {billType === 'invoice'
              ? `Invoice No. ${String(nextNum).padStart(3, '0')} · Stock will be deducted on save`
              : `Challan No. ${String(nextNum).padStart(3, '0')} · Stock not deducted (pending)`
            }
          </p>
        </div>
      </div>

      {/* Bill type toggle */}
      <div className="card mb-5">
        <div className="tabs" style={{ width: 260 }}>
          <button className={`tab-btn ${billType === 'invoice' ? 'active' : ''}`}
            onClick={() => setBillType('invoice')}>
            Tax Invoice
          </button>
          <button className={`tab-btn ${billType === 'challan' ? 'active' : ''}`}
            onClick={() => setBillType('challan')}>
            Delivery Challan
          </button>
        </div>
      </div>

      {/* ── CUSTOMER + DATE ROW ── */}
      <div className="card mb-4">
        <div className="card-title">Customer Details</div>
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr 160px' }}>

          {/* Customer name */}
          <div className="form-group">
            <label className="form-label">Customer Name *</label>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                id="customer-name"
                className="form-input"
                placeholder="Search or type customer..."
                value={customerInput}
                style={{ paddingLeft: 30 }}
                onChange={e => { setCustomerInput(e.target.value); setShowCustDropdown(true); setCustomerId('') }}
                onFocus={() => setShowCustDropdown(true)}
                onBlur={() => setTimeout(() => setShowCustDropdown(false), 200)}
                autoFocus
              />
              {showCustDropdown && custMatches.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', zIndex: 100, marginTop: 4,
                  boxShadow: 'var(--shadow-md)', maxHeight: 200, overflowY: 'auto',
                }}>
                  {custMatches.map(c => (
                    <div key={c.id}
                      style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                      onMouseDown={() => selectCustomer(c)}
                      className="sidebar-link">
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                      {c.gstin && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>GSTIN: {c.gstin}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="form-group">
            <label className="form-label">Address</label>
            <input id="customer-address" className="form-input"
              placeholder="Customer address"
              value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
          </div>

          {/* Date */}
          <div className="form-group">
            <label className="form-label">Date</label>
            <input id="bill-date" className="form-input" type="date"
              value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        {/* Row 2: GSTIN + Place of Supply */}
        <div className="grid gap-4 mt-3" style={{ gridTemplateColumns: '200px 220px 1fr' }}>
          <div className="form-group">
            <label className="form-label">Customer GSTIN</label>
            <input id="customer-gstin" className="form-input"
              placeholder="27XXXXX0000X0XX"
              value={customerGstin} onChange={e => setCustomerGstin(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Place of Supply</label>
            <input id="place-of-supply" className="form-input"
              value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input id="bill-notes" className="form-input"
              placeholder="Optional note..."
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── PRODUCT LINE ITEMS ── */}
      <div className="card mb-4">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="card-title" style={{ margin: 0 }}>Products</div>
          <button id="add-line-item" className="btn btn-secondary btn-sm" onClick={addItem}>
            <Plus size={13} /> Add Row
          </button>
        </div>

        <table className="line-items-table" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 36 }} />        {/* Sr */}
            <col style={{ width: '38%' }} />      {/* Product */}
            <col style={{ width: '13%' }} />      {/* Qty */}
            <col style={{ width: '15%' }} />      {/* Rate */}
            <col style={{ width: '12%' }} />      {/* Discount */}
            <col style={{ width: '18%' }} />      {/* Amount */}
            <col style={{ width: 36 }} />         {/* Delete */}
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'center' }}>Sr</th>
              <th>Product Name</th>
              <th>Qty</th>
              <th>Rate (₹)</th>
              <th>Disc (%)</th>
              <th style={{ textAlign: 'right' }}>Amount (₹)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const matches = getMatches(it.product_name)
              const stockProd = it.product_id ? products.find(p => p.id === it.product_id) : null

              return (
                <tr key={it._key}>
                  {/* Sr No */}
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
                    {idx + 1}
                  </td>

                  {/* Product search */}
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
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              HSN: {p.hsn_sac} · ₹{p.price} · GST {p.gst_rate}% · Stock: {p.quantity}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* HSN badge below product name */}
                    {it.hsn_sac && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        HSN: {it.hsn_sac} · GST: {it.gst_rate}%
                        {stockProd && (
                          <span style={{ marginLeft: 8, color: stockProd.quantity < parseFloat(it.quantity || 0) ? 'var(--red)' : 'var(--green)' }}>
                            · Stock: {stockProd.quantity}
                            {stockProd.quantity < parseFloat(it.quantity || 0) && ' ⚠ Low!'}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Quantity */}
                  <td>
                    <input
                      className="form-input"
                      type="number" min="0.001" step="0.001"
                      placeholder="0.000"
                      value={it.quantity}
                      onChange={e => updateItem(idx, { quantity: e.target.value })}
                    />
                  </td>

                  {/* Rate */}
                  <td>
                    <input
                      className="form-input"
                      type="number" min="0" step="0.01"
                      placeholder="0.00"
                      value={it.rate}
                      onChange={e => updateItem(idx, { rate: e.target.value })}
                    />
                  </td>

                  {/* Discount */}
                  <td>
                    <input
                      className="form-input"
                      type="number" min="0" step="0.01"
                      placeholder="0"
                      value={it.discount_pct}
                      onChange={e => updateItem(idx, { discount_pct: e.target.value })}
                    />
                  </td>

                  {/* Amount (auto-calculated) */}
                  <td style={{ textAlign: 'right', paddingRight: 8 }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
                      color: it.amount > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}>
                      {it.amount > 0 ? `₹${fmt(it.amount)}` : '—'}
                    </div>
                    {it.amount > 0 && it.gst_rate > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                        incl. GST ({(it.gst_rate).toFixed(1)}%)
                      </div>
                    )}
                  </td>

                  {/* Delete */}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn btn-danger btn-icon btn-sm"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                    >
                      <Trash2 size={12} />
                    </button>
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
              <span style={{ color: 'var(--text-secondary)' }}>
                Central Tax ({((items[0]?.gst_rate || 18) / 2).toFixed(1)}%)
              </span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>₹{fmt(totalGst / 2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                State/UT Tax ({((items[0]?.gst_rate || 18) / 2).toFixed(1)}%)
              </span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>₹{fmt(totalGst / 2)}</span>
            </div>
            {roundOff !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Round Off</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {roundOff >= 0 ? '' : '-'}₹{fmt(Math.abs(roundOff))}
                </span>
              </div>
            )}
            <div className="divider" style={{ margin: '2px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>Grand Total</span>
              <span style={{
                fontWeight: 800, fontSize: 24,
                color: 'var(--accent-light)',
                fontFamily: 'var(--font-mono)',
              }}>
                ₹{fmt(grandTotalRounded)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTION BUTTONS ── */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={handleReset}>
          <RotateCcw size={14} /> Reset
        </button>
        <button id="save-bill" className="btn btn-primary btn-lg" onClick={handleSave}>
          <Save size={16} />
          Save &amp; Print {billType === 'invoice' ? 'Invoice' : 'Challan'}
        </button>
      </div>
    </div>
  )
}

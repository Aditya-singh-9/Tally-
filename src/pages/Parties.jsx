import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Users, Plus, IndianRupee, X } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)

function PartyModal({ party, onClose, onSave }) {
  const [form, setForm] = useState(party || {
    name: '', type: 'customer', gstin: '', address: '', phone: ''
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return alert("Name is required")
    onSave(form)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const [fetchingGst, setFetchingGst] = useState(false)

  async function fetchGSTDetails() {
    if (!form.gstin || form.gstin.length !== 15) {
      alert('Please enter a valid 15-digit GSTIN.')
      return
    }
    const apiKey = localStorage.getItem('gst_api_key')
    
    setFetchingGst(true)
    try {
      if (apiKey) {
        // Fast API Key method
        const res = await fetch(`https://appyflow.in/api/verifyGST?gstNo=${form.gstin}&key_secret=${apiKey}`)
        const data = await res.json()
        
        if (data.error || data.message) {
          alert(data.error || data.message || 'Failed to fetch details. Invalid API Key or GSTIN.')
        } else {
          setForm(prev => ({
            ...prev,
            name: data.taxpayerInfo?.tradeName || data.taxpayerInfo?.legalName || prev.name,
            address: data.taxpayerInfo?.pradr?.adr || prev.address
          }))
        }
      } else {
        // Fallback: Invisible Browser Scraper
        if (!window.electronAPI || !window.electronAPI.scrapeGSTIN) {
          alert('Invisible scraper is not available in this environment. Please run the desktop app.')
          setFetchingGst(false)
          return
        }
        
        const data = await window.electronAPI.scrapeGSTIN(form.gstin)
        
        if (data.error) {
          alert(data.error)
        } else {
          setForm(prev => ({
            ...prev,
            name: data.name || prev.name,
            address: data.address || prev.address
          }))
        }
      }
    } catch (err) {
      alert('Error fetching GSTIN details: ' + err.message)
    } finally {
      setFetchingGst(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{party ? 'Edit Party' : 'Add New Party'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Party Name *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)} disabled={!!party}>
                <option value="customer">Customer (Debtor)</option>
                <option value="supplier">Supplier (Creditor)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">GSTIN (Optional)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" value={form.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())} placeholder="27XXXXX1234X1Z5" maxLength={15} style={{ flex: 1 }} />
                <button type="button" className="btn btn-secondary" onClick={fetchGSTDetails} disabled={fetchingGst || !form.gstin}>
                  {fetchingGst ? '...' : 'Auto Fetch'}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-input" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{party ? 'Save changes' : 'Add Party'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LedgerModal({ party, txs, onClose, onAddTx }) {
  const [showTxForm, setShowTxForm] = useState(false)
  const [txObj, setTxObj] = useState({ amount: '', reference: '', date: new Date().toISOString().split('T')[0] })

  const isCustomer = party.type === 'customer'
  const balance = txs.reduce((sum, t) => {
    if (isCustomer) return sum + (t.type === 'invoice' ? t.amount : t.type === 'receipt' ? -t.amount : 0)
    else return sum + (t.type === 'purchase' ? t.amount : t.type === 'payment' ? -t.amount : 0)
  }, 0)

  function handleSaveTx(e) {
    e.preventDefault()
    if (!txObj.amount) return alert("Enter amount")
    onAddTx({
      party_id: party.id,
      date: txObj.date,
      type: isCustomer ? 'receipt' : 'payment',
      reference: txObj.reference,
      amount: parseFloat(txObj.amount)
    })
    setShowTxForm(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 800, height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ alignItems: 'flex-start' }}>
          <div>
            <h2>{party.name} <span className="badge badge-purple" style={{ marginLeft: 8, fontSize: 11 }}>{party.type}</span></h2>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              GSTIN: {party.gstin || 'N/A'} · Phone: {party.phone || 'N/A'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Balance</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: balance > 0 ? (isCustomer ? 'var(--green)' : 'var(--red)') : 'var(--text-primary)' }}>
                {balance > 0 ? `₹${fmt(balance)}` : balance < 0 ? `-₹${fmt(Math.abs(balance))}` : '₹0'}
                {balance > 0 && <span style={{ fontSize: 12, marginLeft: 4 }}>{isCustomer ? 'Dr' : 'Cr'}</span>}
              </div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            {!showTxForm ? (
              <button className="btn btn-primary" onClick={() => setShowTxForm(true)}>
                <Plus size={15} /> {isCustomer ? 'Record Receipt (Payment In)' : 'Record Payment (Payment Out)'}
              </button>
            ) : (
              <form onSubmit={handleSaveTx} className="grid gap-3" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) auto', alignItems: 'end' }}>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={txObj.date} onChange={e => setTxObj(f => ({...f, date: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input type="number" step="0.01" className="form-input" placeholder="0.00" value={txObj.amount} onChange={e => setTxObj(f => ({...f, amount: e.target.value}))} autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Reference / Mode</label>
                  <input className="form-input" placeholder="e.g. NEFT, Cheque, Cash" value={txObj.reference} onChange={e => setTxObj(f => ({...f, reference: e.target.value}))} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn btn-primary">Save</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowTxForm(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Particulars / Ref</th>
                <th>Type</th>
                <th className="num">Debit (Dr)</th>
                <th className="num">Credit (Cr)</th>
              </tr>
            </thead>
            <tbody>
              {txs.map(t => {
                let dr = null, cr = null
                if (isCustomer) {
                  if (t.type === 'invoice') dr = t.amount
                  if (t.type === 'receipt') cr = t.amount
                } else {
                  if (t.type === 'payment') dr = t.amount
                  if (t.type === 'purchase') cr = t.amount
                }
                return (
                  <tr key={t.id}>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric'})}</td>
                    <td style={{ fontWeight: 500 }}>{t.reference}</td>
                    <td>
                      <span className={`badge ${t.type==='invoice'||t.type==='purchase' ? 'badge-blue' : 'badge-green'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="num" style={{ color: dr ? 'var(--text-primary)' : 'transparent' }}>{dr ? `₹${fmt(dr)}` : '-'}</td>
                    <td className="num" style={{ color: cr ? 'var(--text-primary)' : 'transparent' }}>{cr ? `₹${fmt(cr)}` : '-'}</td>
                  </tr>
                )
              })}
              {txs.length === 0 && <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text-muted)', padding: 30}}>No transactions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function Parties() {
  const { parties, addParty, updateParty, getPartyBalance, getPartyTransactions, addTransaction } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [editParty, setEditParty] = useState(null)
  const [ledgerParty, setLedgerParty] = useState(null)
  const [filterType, setFilterType] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = parties.filter(p => (filterType === 'all' || p.type === filterType) && p.name.toLowerCase().includes(search.toLowerCase()))

  async function handleSave(data) {
    try {
      if (editParty) await updateParty(editParty.id, data)
      else await addParty(data)
      setShowAdd(false)
      setEditParty(null)
    } catch(e) { alert(e.message) }
  }

  async function handleAddTx(tx) {
    try {
      await addTransaction(tx)
    } catch(e) { alert(e.message) }
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div>
          <h1>Parties &amp; Ledgers</h1>
          <p>Manage customers, suppliers, and track outstanding balances (udhaar)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Party
        </button>
      </div>

      <div className="card mb-5">
        <div className="tabs" style={{ width: 280 }}>
          <button className={`tab-btn ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>All</button>
          <button className={`tab-btn ${filterType === 'customer' ? 'active' : ''}`} onClick={() => setFilterType('customer')}>Customers</button>
          <button className={`tab-btn ${filterType === 'supplier' ? 'active' : ''}`} onClick={() => setFilterType('supplier')}>Suppliers</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Party Name</th>
              <th>Type</th>
              <th>GSTIN</th>
              <th className="num">Outstanding Balance</th>
              <th style={{ textAlign:'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const bal = getPartyBalance(p.id)
              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.phone || 'No phone'}</div>
                  </td>
                  <td>
                    <span className={`badge ${p.type === 'customer' ? 'badge-blue' : 'badge-purple'}`}>
                      {p.type}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {p.gstin || '—'}
                  </td>
                  <td className="num" style={{ fontWeight: 700, color: bal > 0 ? (p.type==='customer'?'var(--green)':'var(--red)') : 'var(--text-primary)'}}>
                    {bal === 0 ? '₹0' : `${bal > 0 ? '' : '-' }₹${fmt(Math.abs(bal))} ${bal > 0 ? (p.type==='customer'?'Dr':'Cr') : ''}`}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setLedgerParty(p)}>View Ledger</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditParty(p)} style={{ marginLeft: 8 }}>Edit</button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>
                <Users size={32} color="var(--border)" style={{ marginBottom: 16 }} />
                <h3>No parties found</h3>  
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {(showAdd || editParty) && (
        <PartyModal party={editParty} onClose={() => { setShowAdd(false); setEditParty(null) }} onSave={handleSave} />
      )}

      {ledgerParty && (
        <LedgerModal party={ledgerParty} txs={getPartyTransactions(ledgerParty.id)} onClose={() => setLedgerParty(null)} onAddTx={handleAddTx} />
      )}
    </div>
  )
}

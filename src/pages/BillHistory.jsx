import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Search, Printer, RefreshCw, Trash2, X, ArrowRight, History } from 'lucide-react'
import InvoicePrint from '../components/PrintTemplate/InvoicePrint'
import ChallanPrint from '../components/PrintTemplate/ChallanPrint'

const fmt = n => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)

export default function BillHistory({ onNavigate }) {
  const { bills, convertChallanToInvoice, deleteBill, profile } = useApp()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [printBill, setPrintBill] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [page, setPage] = useState(1)
  const PER_PAGE = 15

  const filtered = bills.filter(b => {
    if (search) {
      const q = search.toLowerCase()
      if (!b.customer_name.toLowerCase().includes(q) &&
        !String(b.bill_number).includes(q)) return false
    }
    if (typeFilter !== 'all' && b.type !== typeFilter) return false
    if (statusFilter !== 'all' && b.status !== statusFilter) return false
    if (dateFrom && b.date < dateFrom) return false
    if (dateTo && b.date > dateTo) return false
    return true
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function handleConvert(id) {
    const invoice = convertChallanToInvoice(id)
    if (invoice) setPrintBill(invoice)
  }

  if (printBill) {
    return (
      <div>
        <div className="no-print" style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={15} /> Print / Download PDF
          </button>
          <button className="btn btn-secondary" onClick={() => setPrintBill(null)}>
            ← Back to History
          </button>
        </div>
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 4px 32px rgba(0,0,0,0.3)', maxWidth: 800 }}>
          {printBill.type === 'invoice'
            ? <InvoicePrint bill={printBill} profile={profile} />
            : <ChallanPrint bill={printBill} profile={profile} />
          }
        </div>
      </div>
    )
  }

  const totalRevenue = bills.filter(b => b.type === 'invoice' && b.status === 'completed')
    .reduce((s, b) => s + b.grand_total, 0)

  return (
    <div>
      <div className="page-header flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div>
          <h1>Bill History</h1>
          <p>{bills.length} total bills · Revenue: ₹{fmt(totalRevenue)}</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('billing')}>
          + New Bill
        </button>
      </div>

      {/* Summary chips */}
      <div className="grid grid-4 gap-4 mb-6">
        {[
          { label: 'Total Bills', value: bills.length, color: 'var(--accent-light)' },
          { label: 'Invoices', value: bills.filter(b => b.type === 'invoice').length, color: 'var(--green)' },
          { label: 'Challans', value: bills.filter(b => b.type === 'challan').length, color: 'var(--blue)' },
          { label: 'Pending', value: bills.filter(b => b.status === 'pending').length, color: 'var(--yellow)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-row mb-4" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={14} />
          <input id="history-search" className="form-input" placeholder="Search customer or bill no..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>

        <select id="type-filter" className="form-select" value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1) }}>
          <option value="all">All Types</option>
          <option value="invoice">Invoice</option>
          <option value="challan">Challan</option>
        </select>

        <select id="status-filter" className="form-select" value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="converted">Converted</option>
        </select>

        <input className="form-input" type="date" value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setPage(1) }}
          style={{ width: 150 }} placeholder="From date" />
        <input className="form-input" type="date" value={dateTo}
          onChange={e => { setDateTo(e.target.value); setPage(1) }}
          style={{ width: 150 }} placeholder="To date" />

        {(search || typeFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo) && (
          <button className="btn btn-ghost btn-sm" onClick={() => {
            setSearch(''); setTypeFilter('all'); setStatusFilter('all'); setDateFrom(''); setDateTo('')
          }}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Bill No</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Status</th>
              <th className="num">Subtotal</th>
              <th className="num">GST</th>
              <th className="num">Grand Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={9}>
                <div className="empty-state">
                  <History size={36} />
                  <h3>No bills found</h3>
                  <p>Try adjusting your filters or create a new bill.</p>
                </div>
              </td></tr>
            ) : paginated.map(b => (
              <tr key={b.id}>
                <td>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent-light)' }}>
                    {b.type === 'invoice' ? 'INV' : 'DC'}-{String(b.bill_number).padStart(3, '0')}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  {new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ fontWeight: 500 }}>
                  {b.customer_name}
                  {b.customer_gstin && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.customer_gstin}</div>}
                </td>
                <td>
                  <span className={`badge ${b.type === 'invoice' ? 'badge-green' : 'badge-blue'}`}>
                    {b.type === 'invoice' ? 'Invoice' : 'Challan'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${
                    b.status === 'completed' ? 'badge-green' :
                    b.status === 'pending'   ? 'badge-yellow' : 'badge-gray'
                  }`}>{b.status}</span>
                </td>
                <td className="num">₹{fmt(b.subtotal)}</td>
                <td className="num">₹{fmt(b.total_gst)}</td>
                <td className="num" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{fmt(b.grand_total)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      data-tooltip="Print"
                      onClick={() => setPrintBill(b)}
                    ><Printer size={13} /></button>

                    {b.type === 'challan' && b.status === 'pending' && (
                      <button
                        className="btn btn-success btn-sm"
                        data-tooltip="Convert to Invoice"
                        onClick={() => handleConvert(b.id)}
                        style={{ fontSize: 11 }}
                      >
                        <ArrowRight size={12} /> Invoice
                      </button>
                    )}

                    <button
                      className="btn btn-danger btn-icon btn-sm"
                      data-tooltip="Delete"
                      onClick={() => setDeleteId(b.id)}
                    ><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPage(p)}>{p}</button>
          ))}
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
        </div>
      )}

      {/* Delete Modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h2>Delete Bill?</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setDeleteId(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                This will permanently delete this bill. Stock quantities will NOT be restored automatically.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { deleteBill(deleteId); setDeleteId(null) }}>
                Delete Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

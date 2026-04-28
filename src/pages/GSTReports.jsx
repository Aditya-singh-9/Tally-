import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { Download, Calculator } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n || 0)

export default function GSTReports() {
  const { bills, purchases, profile } = useApp()
  const [activeTab, setActiveTab] = useState('sales') // 'sales' or 'purchases'
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const companyStateCode = profile?.gstin?.substring(0, 2) || ''

  const salesData = useMemo(() => {
    const summary = {}
    bills.forEach(b => {
      if (b.type !== 'invoice' || b.status !== 'completed') return
      if (startDate && new Date(b.date) < new Date(startDate)) return
      if (endDate && new Date(b.date) > new Date(endDate)) return

      const partyKey = b.customer_gstin || b.customer_name || 'B2C (Cash/Unregistered)'
      if (!summary[partyKey]) {
        summary[partyKey] = {
          gstin: b.customer_gstin || 'Unregistered',
          name: b.customer_name || 'Cash',
          invoiceCount: 0,
          voucherAmount: 0,
          taxableAmount: 0,
          cgst: 0,
          sgst: 0,
          igst: 0
        }
      }

      const s = summary[partyKey]
      s.invoiceCount += 1
      s.voucherAmount += parseFloat(b.grand_total || 0)

      let invoiceTaxable = 0
      let invoiceTax = 0
      b.items?.forEach(it => {
        invoiceTaxable += parseFloat(it.amount || 0)
        invoiceTax += parseFloat(it.amount || 0) * (parseFloat(it.gst_rate || 18) / 100)
      })

      s.taxableAmount += invoiceTaxable

      // State matching logic
      const isLocal = !b.customer_gstin || (companyStateCode && b.customer_gstin.startsWith(companyStateCode))
      if (isLocal) {
        s.cgst += invoiceTax / 2
        s.sgst += invoiceTax / 2
      } else {
        s.igst += invoiceTax
      }
    })
    return Object.values(summary).sort((a, b) => b.voucherAmount - a.voucherAmount)
  }, [bills, startDate, endDate, companyStateCode])

  const purchaseData = useMemo(() => {
    const summary = {}
    purchases.forEach(b => {
      if (b.status !== 'completed') return
      if (startDate && new Date(b.date) < new Date(startDate)) return
      if (endDate && new Date(b.date) > new Date(endDate)) return

      // In Purchases, party details are usually fetched via party_id
      // but purchases table has party_name and total_gst.
      const partyKey = b.party_name || 'Cash Purchase'
      // We will look up GSTIN from party list if needed, but since purchase table doesn't store GSTIN directly,
      // we just use generic summary
      if (!summary[partyKey]) {
        summary[partyKey] = {
          gstin: 'Available in Master',
          name: b.party_name || 'Cash',
          invoiceCount: 0,
          voucherAmount: 0,
          taxableAmount: 0,
          cgst: 0,
          sgst: 0,
          igst: 0
        }
      }

      const s = summary[partyKey]
      s.invoiceCount += 1
      s.voucherAmount += parseFloat(b.grand_total || 0)

      let invoiceTaxable = 0
      let invoiceTax = 0
      b.items?.forEach(it => {
        invoiceTaxable += parseFloat(it.amount || 0)
        invoiceTax += parseFloat(it.amount || 0) * (parseFloat(it.gst_rate || 18) / 100)
      })

      s.taxableAmount += invoiceTaxable

      // We don't have supplier GSTIN saved directly on the purchase row in current schema,
      // so we make a simple assumption: if IGST was applied we'd know, but currently we just assume local
      // unless we fetch party data. For simplicity without a huge DB join, we assume local for now.
      s.cgst += invoiceTax / 2
      s.sgst += invoiceTax / 2
    })
    return Object.values(summary).sort((a, b) => b.voucherAmount - a.voucherAmount)
  }, [purchases, startDate, endDate])

  const displayData = activeTab === 'sales' ? salesData : purchaseData
  const title = activeTab === 'sales' ? 'GSTR-1 B2B/B2C Summary (Outward Supplies)' : 'GSTR-2 Summary (Inward Supplies)'

  // Totals
  const tInvoice = displayData.reduce((s, r) => s + r.invoiceCount, 0)
  const tVoucher = displayData.reduce((s, r) => s + r.voucherAmount, 0)
  const tTaxable = displayData.reduce((s, r) => s + r.taxableAmount, 0)
  const tCgst = displayData.reduce((s, r) => s + r.cgst, 0)
  const tSgst = displayData.reduce((s, r) => s + r.sgst, 0)
  const tIgst = displayData.reduce((s, r) => s + r.igst, 0)

  function exportCSV() {
    const rows = [
      [title, `From: ${startDate || 'All Time'}`, `To: ${endDate || 'All Time'}`],
      [],
      ['Sr No', 'GSTIN No.', 'Party Name', 'No of Invoices', 'Voucher Amount', 'Taxable Amount', 'State/UT Tax (SGST)', 'Central Tax (CGST)', 'Integrated Tax (IGST)']
    ]
    displayData.forEach((row, i) => {
      rows.push([
        i + 1, row.gstin, row.name, row.invoiceCount,
        row.voucherAmount.toFixed(2), row.taxableAmount.toFixed(2),
        row.sgst.toFixed(2), row.cgst.toFixed(2), row.igst.toFixed(2)
      ])
    })
    rows.push([
      '', 'TOTAL', '', tInvoice,
      tVoucher.toFixed(2), tTaxable.toFixed(2),
      tSgst.toFixed(2), tCgst.toFixed(2), tIgst.toFixed(2)
    ])

    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${activeTab}_summary.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-content animate-fade-in">
      <div className="page-header flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--indigo), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calculator size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>GST Summary</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Tally-style B2B/B2C Party-wise Returns</p>
          </div>
        </div>
      </div>

      <div className="card mb-6" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div className="tabs" style={{ display: 'flex', gap: 4 }}>
          <button className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
            Outward (Sales / GSTR-1)
          </button>
          <button className={`tab-btn ${activeTab === 'purchases' ? 'active' : ''}`} onClick={() => setActiveTab('purchases')}>
            Inward (Purchases / GSTR-2)
          </button>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>FROM DATE</div>
              <input type="date" className="form-input" style={{ width: 140, padding: '6px 12px', fontSize: 13 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>TO DATE</div>
              <input type="date" className="form-input" style={{ width: 140, padding: '6px 12px', fontSize: 13 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            {(startDate || endDate) && (
              <button className="btn btn-ghost" style={{ alignSelf: 'flex-end', padding: '6px 12px', color: 'var(--red)' }} onClick={() => { setStartDate(''); setEndDate('') }}>
                Clear
              </button>
            )}
          </div>
          <button className="btn btn-primary" onClick={exportCSV}>
            <Download size={15} /> Export Report
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto', border: '1px solid var(--border)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          <div className="card-title" style={{ margin: 0, color: 'var(--text-primary)', fontSize: 14 }}>{title}</div>
        </div>
        <table className="data-table" style={{ whiteSpace: 'nowrap' }}>
          <thead>
            <tr>
              <th style={{ width: 50, textAlign: 'center' }}>Sr No</th>
              <th>GSTIN No.</th>
              <th>Party Name</th>
              <th className="num">No of Invoices</th>
              <th className="num">Voucher Amount</th>
              <th className="num">Taxable Amount</th>
              <th className="num">Central Tax (CGST)</th>
              <th className="num">State/UT Tax (SGST)</th>
              <th className="num">Integrated Tax (IGST)</th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, i) => (
              <tr key={i}>
                <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{i + 1}</td>
                <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 13 }}>{row.gstin}</td>
                <td style={{ fontWeight: 600 }}>{row.name}</td>
                <td className="num">{row.invoiceCount}</td>
                <td className="num" style={{ fontWeight: 600 }}>₹{fmt(row.voucherAmount)}</td>
                <td className="num">₹{fmt(row.taxableAmount)}</td>
                <td className="num" style={{ color: row.cgst > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>₹{fmt(row.cgst)}</td>
                <td className="num" style={{ color: row.sgst > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>₹{fmt(row.sgst)}</td>
                <td className="num" style={{ color: row.igst > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>₹{fmt(row.igst)}</td>
              </tr>
            ))}
            {displayData.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No records found for the selected period.</td></tr>
            )}
          </tbody>
          {displayData.length > 0 && (
            <tfoot style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-secondary)', position: 'sticky', bottom: 0 }}>
              <tr>
                <td colSpan={3} style={{ padding: '12px 20px', fontWeight: 800, textAlign: 'right' }}>TOTAL</td>
                <td className="num" style={{ fontWeight: 800 }}>{tInvoice}</td>
                <td className="num" style={{ fontWeight: 800, color: 'var(--accent)' }}>₹{fmt(tVoucher)}</td>
                <td className="num" style={{ fontWeight: 800 }}>₹{fmt(tTaxable)}</td>
                <td className="num" style={{ fontWeight: 800, color: 'var(--indigo)' }}>₹{fmt(tCgst)}</td>
                <td className="num" style={{ fontWeight: 800, color: 'var(--indigo)' }}>₹{fmt(tSgst)}</td>
                <td className="num" style={{ fontWeight: 800, color: 'var(--indigo)' }}>₹{fmt(tIgst)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

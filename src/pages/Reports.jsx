import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { getTopProducts } from '../lib/analytics'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { Download } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13 }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {p.name.includes('₹') || p.name === 'Revenue' || p.name === 'Purchases' ? '₹' : ''}{fmt(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function Reports() {
  const { bills, purchases, products } = useApp()
  const [period, setPeriod] = useState('monthly')

  const invoices = bills.filter(b => b.type === 'invoice' && b.status === 'completed')
  const completedPurchases = purchases.filter(b => b.status === 'completed')

  // Group by period
  function groupBy(invs, purs, p) {
    const map = {}
    invs.forEach(b => {
      const d = new Date(b.date)
      let key = p === 'daily' ? b.date : p === 'monthly' ? d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : String(d.getFullYear())
      if (!map[key]) map[key] = { label: key, revenue: 0, purchases: 0 }
      map[key].revenue += b.grand_total
    })
    purs.forEach(b => {
      const d = new Date(b.date)
      let key = p === 'daily' ? b.date : p === 'monthly' ? d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : String(d.getFullYear())
      if (!map[key]) map[key] = { label: key, revenue: 0, purchases: 0 }
      map[key].purchases += b.grand_total
    })
    return Object.values(map)
  }

  const revenueData = groupBy(invoices, completedPurchases, period)

  // Category revenue breakdown
  const categoryMap = {}
  invoices.forEach(b => {
    b.items.forEach(it => {
      const prod = products.find(p => p.id === it.product_id)
      const cat = prod?.category || 'Other'
      categoryMap[cat] = (categoryMap[cat] || 0) + it.amount
    })
  })
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }))

  const topProducts = getTopProducts(bills)

  // Month-over-month
  const totalRevenue = invoices.reduce((s, b) => s + b.grand_total, 0)
  const totalPurchases = completedPurchases.reduce((s, p) => s + p.grand_total, 0)
  const outputGst = invoices.reduce((s, b) => s + b.total_gst, 0)
  const inputGst = completedPurchases.reduce((s, p) => s + p.total_gst, 0)

  // ── GST Computation (Tally Style) ──────────────────────────────
  const gstSummary = { sales: {}, purchases: {} }

  invoices.forEach(b => {
    b.items.forEach(it => {
      const rate = it.gst_rate || 18
      const taxable = it.amount || 0
      const tax = taxable * (rate / 100)
      if (!gstSummary.sales[rate]) gstSummary.sales[rate] = { taxable: 0, tax: 0 }
      gstSummary.sales[rate].taxable += taxable
      gstSummary.sales[rate].tax += tax
    })
  })

  completedPurchases.forEach(b => {
    b.items.forEach(it => {
      const rate = it.gst_rate || 18
      const taxable = it.amount || 0
      const tax = taxable * (rate / 100)
      if (!gstSummary.purchases[rate]) gstSummary.purchases[rate] = { taxable: 0, tax: 0 }
      gstSummary.purchases[rate].taxable += taxable
      gstSummary.purchases[rate].tax += tax
    })
  })

  const salesRates = Object.keys(gstSummary.sales).sort((a, b) => Number(a) - Number(b))
  const purchaseRates = Object.keys(gstSummary.purchases).sort((a, b) => Number(a) - Number(b))

  const totalSalesTaxable = salesRates.reduce((sum, r) => sum + gstSummary.sales[r].taxable, 0)
  const totalPurchaseTaxable = purchaseRates.reduce((sum, r) => sum + gstSummary.purchases[r].taxable, 0)

  function exportGSTComputation() {
    const rows = [
      ['GST Computation Summary (GSTR-3B Style)'],
      [],
      ['Outward Supplies (Sales)'],
      ['GST Rate', 'Taxable Value', 'Tax Amount (Output)']
    ]
    
    salesRates.forEach(r => {
      rows.push([`${r}%`, gstSummary.sales[r].taxable.toFixed(2), gstSummary.sales[r].tax.toFixed(2)])
    })
    rows.push(['Total Sales', totalSalesTaxable.toFixed(2), outputGst.toFixed(2)])
    
    rows.push([])
    rows.push(['Inward Supplies (Purchases)'])
    rows.push(['GST Rate', 'Taxable Value', 'Tax Amount (Input ITC)'])
    
    purchaseRates.forEach(r => {
      rows.push([`${r}%`, gstSummary.purchases[r].taxable.toFixed(2), gstSummary.purchases[r].tax.toFixed(2)])
    })
    rows.push(['Total Purchases', totalPurchaseTaxable.toFixed(2), inputGst.toFixed(2)])
    
    rows.push([])
    rows.push(['Net Liability'])
    const net = outputGst - inputGst
    rows.push([net >= 0 ? 'GST Payable' : 'Excess ITC', '', Math.abs(net).toFixed(2)])

    downloadCSV(rows, 'GST_Computation.csv')
  }

  function exportGSTR1() {
    const rows = [['GSTIN/UIN of Recipient', 'Receiver Name', 'Invoice Number', 'Invoice Date', 'Invoice Value', 'Place Of Supply', 'Reverse Charge', 'Notes', 'Invoice Type', 'Rate', 'Taxable Value']]
    invoices.forEach(b => {
      const rateMap = {}
      b.items.forEach(it => {
        const r = it.gst_rate || 18
        const amt = it.amount // Without GST
        if (!rateMap[r]) rateMap[r] = 0
        rateMap[r] += amt
      })
      Object.entries(rateMap).forEach(([r, baseAmt]) => {
        rows.push([
          b.customer_gstin || '', b.customer_name, `INV-${b.bill_number}`, b.date, b.grand_total,
          b.place_of_supply, 'N', '', 'Regular B2B/B2C', r, baseAmt.toFixed(2)
        ])
      })
    })
    downloadCSV(rows, 'GSTR-1_Sales_Report.csv')
  }

  function exportGSTR2() {
    const rows = [['GSTIN of Supplier', 'Supplier Name', 'Invoice Number', 'Invoice Date', 'Invoice Value', 'Place Of Supply', 'Reverse Charge', 'Invoice Type', 'Rate', 'Taxable Value']]
    completedPurchases.forEach(b => {
      const rateMap = {}
      b.items.forEach(it => {
        const r = it.gst_rate || 18
        const amt = it.amount
        if (!rateMap[r]) rateMap[r] = 0
        rateMap[r] += amt
      })
      Object.entries(rateMap).forEach(([r, baseAmt]) => {
        rows.push([
          '', b.party_name, b.bill_number, b.date, b.grand_total,
          '27-Maharashtra', 'N', 'Regular', r, baseAmt.toFixed(2)
        ])
      })
    })
    downloadCSV(rows, 'GSTR-2_Purchases_Report.csv')
  }

  function downloadCSV(rows, filename) {
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div>
          <h1>Reports &amp; GST</h1>
          <p>Sales, Purchases, and Tax Liability Insights</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={exportGSTR1}>
            <Download size={15} /> GSTR-1
          </button>
          <button className="btn btn-secondary" onClick={exportGSTR2}>
            <Download size={15} /> GSTR-2
          </button>
          <button className="btn btn-primary" onClick={exportGSTComputation}>
            <Download size={15} /> Export Computation (Excel)
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-4 gap-4 mb-6">
        {[
          { label: 'Total Sales', value: '₹' + fmt(totalRevenue), color: 'var(--text-primary)', sub: `From ${invoices.length} invoices` },
          { label: 'Total Purchases', value: '₹' + fmt(totalPurchases), color: 'var(--text-primary)', sub: `From ${completedPurchases.length} purchases` },
          { label: 'Output GST (Collected)', value: '₹' + fmt(outputGst), color: 'var(--green)', sub: 'Payable to Govt' },
          { label: 'Input GST (ITC)', value: '₹' + fmt(inputGst), color: 'var(--red)', sub: 'Claimable from Govt' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="card mb-6" style={{ background: 'var(--bg-card)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid ' + (outputGst > inputGst ? 'var(--yellow)' : 'var(--green)')}}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Net GST Liability</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {outputGst > inputGst ? 'Payment required: ' : 'Excess ITC: '} 
            ₹{fmt(Math.abs(outputGst - inputGst))}
          </div>
        </div>
      </div>

      {/* Tally-Style GST Computation */}
      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Output Tax (Sales) */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div className="card-title" style={{ margin: 0, color: 'var(--text-primary)' }}>Outward Supplies (Sales)</div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>GST Rate</th>
                <th className="num">Taxable Value</th>
                <th className="num" style={{ paddingRight: 20 }}>Tax Amount</th>
              </tr>
            </thead>
            <tbody>
              {salesRates.map(r => (
                <tr key={r}>
                  <td style={{ paddingLeft: 20, fontWeight: 600, color: 'var(--accent)' }}>{r}%</td>
                  <td className="num">₹{fmt(gstSummary.sales[r].taxable)}</td>
                  <td className="num" style={{ paddingRight: 20, fontWeight: 500 }}>₹{fmt(gstSummary.sales[r].tax)}</td>
                </tr>
              ))}
              {salesRates.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No sales data</td></tr>
              )}
            </tbody>
            {salesRates.length > 0 && (
              <tfoot style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <tr>
                  <td style={{ padding: '12px 20px', fontWeight: 700 }}>Total Output</td>
                  <td className="num" style={{ fontWeight: 700 }}>₹{fmt(totalSalesTaxable)}</td>
                  <td className="num" style={{ paddingRight: 20, fontWeight: 700, color: 'var(--green)' }}>₹{fmt(outputGst)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Input Tax (Purchases) */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div className="card-title" style={{ margin: 0, color: 'var(--text-primary)' }}>Inward Supplies (Purchases)</div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>GST Rate</th>
                <th className="num">Taxable Value</th>
                <th className="num" style={{ paddingRight: 20 }}>Tax (ITC)</th>
              </tr>
            </thead>
            <tbody>
              {purchaseRates.map(r => (
                <tr key={r}>
                  <td style={{ paddingLeft: 20, fontWeight: 600, color: 'var(--indigo)' }}>{r}%</td>
                  <td className="num">₹{fmt(gstSummary.purchases[r].taxable)}</td>
                  <td className="num" style={{ paddingRight: 20, fontWeight: 500 }}>₹{fmt(gstSummary.purchases[r].tax)}</td>
                </tr>
              ))}
              {purchaseRates.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No purchase data</td></tr>
              )}
            </tbody>
            {purchaseRates.length > 0 && (
              <tfoot style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <tr>
                  <td style={{ padding: '12px 20px', fontWeight: 700 }}>Total ITC</td>
                  <td className="num" style={{ fontWeight: 700 }}>₹{fmt(totalPurchaseTaxable)}</td>
                  <td className="num" style={{ paddingRight: 20, fontWeight: 700, color: 'var(--red)' }}>₹{fmt(inputGst)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Period selector + chart */}
      <div className="card mb-6">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="card-title" style={{ margin: 0 }}>Revenue &amp; Purchases Over Time</div>
          <div className="tabs" style={{ width: 200 }}>
            {['daily', 'monthly', 'yearly'].map(p => (
              <button key={p} className={`tab-btn ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`}
              axisLine={false} tickLine={false} width={65} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" name="Sales" fill="var(--accent)" radius={[4,4,0,0]} />
            <Bar dataKey="purchases" name="Purchases" fill="var(--indigo)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: '1fr 340px' }}>
        {/* Top Products table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div className="card-title" style={{ margin: 0 }}>Top Products by Revenue</div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Product</th><th className="num">Qty Sold</th><th className="num">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={p.name}>
                  <td style={{ color: 'var(--text-muted)', width: 40 }}>{i + 1}</td>
                  <td style={{ fontWeight: 500, maxWidth: 280 }}>{p.name}</td>
                  <td className="num">{fmt(p.qty)}</td>
                  <td className="num" style={{ color: 'var(--accent-light)', fontWeight: 700 }}>₹{fmt(p.revenue)}</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No invoice data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Category pie */}
        <div className="card">
          <div className="card-title">Revenue by Category</div>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                  labelLine={false} fontSize={11}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => ['₹' + fmt(v), 'Revenue']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <p>No data yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

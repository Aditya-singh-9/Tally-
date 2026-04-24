import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { getTopProducts } from '../lib/mockData'
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
          {p.name}: {p.name.includes('₹') || p.name === 'Revenue' ? '₹' : ''}{fmt(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function Reports() {
  const { bills, products } = useApp()
  const [period, setPeriod] = useState('monthly')

  const invoices = bills.filter(b => b.type === 'invoice' && b.status === 'completed')

  // Group by period
  function groupBy(bills, p) {
    const map = {}
    bills.forEach(b => {
      const d = new Date(b.date)
      let key
      if (p === 'daily') key = b.date
      else if (p === 'weekly') {
        const week = Math.ceil(d.getDate() / 7)
        key = `${d.getFullYear()}-W${String(week).padStart(2, '0')} (${d.toLocaleDateString('en-IN', { month: 'short' })})`
      }
      else if (p === 'monthly') key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      else key = String(d.getFullYear())
      map[key] = (map[key] || 0) + b.grand_total
    })
    return Object.entries(map).map(([label, revenue]) => ({ label, revenue }))
  }

  const revenueData = groupBy(invoices, period)

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
  const avgOrderValue = invoices.length ? totalRevenue / invoices.length : 0

  function exportCSV() {
    const rows = [['Bill No', 'Date', 'Customer', 'Type', 'Subtotal', 'GST', 'Grand Total', 'Status']]
    bills.forEach(b => {
      rows.push([`${b.type === 'invoice' ? 'INV' : 'DC'}-${String(b.bill_number).padStart(3, '0')}`,
        b.date, b.customer_name, b.type, b.subtotal, b.total_gst, b.grand_total, b.status])
    })
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'bills_export.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div>
          <h1>Reports</h1>
          <p>Sales analytics and business insights</p>
        </div>
        <button className="btn btn-secondary" onClick={exportCSV}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: '₹' + fmt(totalRevenue), sub: `From ${invoices.length} invoices` },
          { label: 'Avg Order Value', value: '₹' + fmt(avgOrderValue), sub: 'Per invoice' },
          { label: 'Products Sold', value: invoices.reduce((s,b) => s + b.items.reduce((x,i) => x + i.quantity, 0), 0), sub: 'Total units' },
          { label: 'Total GST', value: '₹' + fmt(invoices.reduce((s,b) => s + b.total_gst, 0)), sub: 'Collected' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Period selector + chart */}
      <div className="card mb-6">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="card-title" style={{ margin: 0 }}>Revenue Over Time</div>
          <div className="tabs" style={{ width: 280 }}>
            {['daily', 'weekly', 'monthly', 'yearly'].map(p => (
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
            <Bar dataKey="revenue" name="Revenue" fill="var(--accent)" radius={[4,4,0,0]} />
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

      {/* Monthly revenue table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="card-title" style={{ margin: 0 }}>All Bills Summary</div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Bill No</th><th>Date</th><th>Customer</th><th>Type</th><th>Status</th>
              <th className="num">Subtotal</th><th className="num">GST</th><th className="num">Grand Total</th>
            </tr>
          </thead>
          <tbody>
            {bills.map(b => (
              <tr key={b.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {b.type === 'invoice' ? 'INV' : 'DC'}-{String(b.bill_number).padStart(3, '0')}
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  {new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td>{b.customer_name}</td>
                <td><span className={`badge ${b.type === 'invoice' ? 'badge-green' : 'badge-blue'}`}>{b.type}</span></td>
                <td>
                  <span className={`badge ${b.status === 'completed' ? 'badge-green' : b.status === 'pending' ? 'badge-yellow' : 'badge-gray'}`}>
                    {b.status}
                  </span>
                </td>
                <td className="num">₹{fmt(b.subtotal)}</td>
                <td className="num">₹{fmt(b.total_gst)}</td>
                <td className="num" style={{ fontWeight: 700 }}>₹{fmt(b.grand_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

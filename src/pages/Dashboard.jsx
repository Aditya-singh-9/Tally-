import { useApp } from '../context/AppContext'
import { getRevenue, getTopProducts, getSalesTrend } from '../lib/mockData'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  TrendingUp, Package, FileText, IndianRupee,
  ArrowUpRight, AlertTriangle, Clock
} from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 14px',
      fontSize: 13,
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--accent-light)', fontWeight: 700 }}>
        ₹{fmt(payload[0].value)}
      </div>
    </div>
  )
}

export default function Dashboard({ onNavigate }) {
  const { bills, products } = useApp()

  const dailyRev = getRevenue(bills, 'daily')
  const monthlyRev = getRevenue(bills, 'monthly')
  const quarterlyRev = getRevenue(bills, 'quarterly')
  const yearlyRev = getRevenue(bills, 'yearly')

  const topProducts = getTopProducts(bills)
  const salesTrend = getSalesTrend(bills)

  const pendingChallans = bills.filter(b => b.type === 'challan' && b.status === 'pending')
  const lowStockItems = products.filter(p => p.quantity <= p.low_stock_threshold)
  const recentBills = bills.slice(0, 5)

  const kpis = [
    { label: "Today's Revenue",   value: dailyRev,     color: 'accent', icon: IndianRupee },
    { label: 'Monthly Revenue',    value: monthlyRev,   color: 'green',  icon: TrendingUp },
    { label: 'Quarterly Revenue',  value: quarterlyRev, color: 'yellow', icon: BarChart },
    { label: 'Yearly Revenue',     value: yearlyRev,    color: 'blue',   icon: ArrowUpRight },
  ]

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Business overview — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-4 gap-4 mb-6">
        {kpis.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`kpi-card ${color}`}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">₹{fmt(value)}</div>
            <div className="kpi-sub">
              <TrendingUp size={12} />
              <span>Based on invoices</span>
            </div>
            <div className={`kpi-icon ${color}`}>
              <Icon size={18} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: '1fr 380px' }}>
        {/* Sales Trend */}
        <div className="card">
          <div className="card-title">Sales Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={salesTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickFormatter={d => d.slice(5)}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`}
                axisLine={false} tickLine={false}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="var(--accent)"
                strokeWidth={2.5}
                dot={{ fill: 'var(--accent)', r: 4 }}
                activeDot={{ r: 6, fill: 'var(--accent-light)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="card">
          <div className="card-title">Top Products by Revenue</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topProducts.map((p, i) => {
              const maxRevenue = topProducts[0]?.revenue || 1
              const pct = (p.revenue / maxRevenue) * 100
              return (
                <div key={p.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>#{i + 1}</span>
                      {p.name}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--accent-light)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      ₹{fmt(p.revenue)}
                    </span>
                  </div>
                  <div className="stock-bar-wrap">
                    <div className="stock-bar" style={{ width: `${pct}%`, background: `hsl(${240 + i * 20}, 70%, 65%)` }} />
                  </div>
                </div>
              )
            })}
            {topProducts.length === 0 && (
              <div className="empty-state" style={{ padding: 20 }}>
                <p>No invoice data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 320px' }}>
        {/* Recent Bills */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="card-title" style={{ margin: 0 }}>Recent Bills</div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('history')}>View all</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Customer</th><th>Type</th><th>Date</th><th className="num">Total</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBills.map(b => (
                <tr key={b.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {b.type === 'invoice' ? 'INV' : 'DC'}-{String(b.bill_number).padStart(3, '0')}
                  </td>
                  <td style={{ fontWeight: 500 }}>{b.customer_name}</td>
                  <td>
                    <span className={`badge ${b.type === 'invoice' ? 'badge-green' : 'badge-blue'}`}>
                      {b.type === 'invoice' ? 'Invoice' : 'Challan'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="num">₹{fmt(b.grand_total)}</td>
                  <td>
                    <span className={`badge ${
                      b.status === 'completed' ? 'badge-green' :
                      b.status === 'pending'   ? 'badge-yellow' : 'badge-gray'
                    }`}>{b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Alerts panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Pending challans */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Clock size={15} color="var(--yellow)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--yellow)' }}>
                Pending Challans ({pendingChallans.length})
              </span>
            </div>
            {pendingChallans.length === 0
              ? <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No pending challans</p>
              : pendingChallans.map(c => (
                <div key={c.id} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid var(--border-light)',
                  fontSize: 13,
                }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>DC-{String(c.bill_number).padStart(3, '0')}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{c.customer_name}</span>
                </div>
              ))
            }
          </div>

          {/* Low stock */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AlertTriangle size={15} color="var(--red)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>
                Low Stock ({lowStockItems.length})
              </span>
            </div>
            {lowStockItems.length === 0
              ? <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>All stock levels healthy</p>
              : lowStockItems.slice(0, 5).map(p => (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13,
                }}>
                  <span style={{
                    color: 'var(--text-primary)', fontWeight: 500,
                    maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>{p.name}</span>
                  <span style={{ color: p.quantity === 0 ? 'var(--red)' : 'var(--yellow)', fontWeight: 700 }}>
                    {p.quantity} left
                  </span>
                </div>
              ))
            }
          </div>

          {/* Quick stats */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div className="card-title">Quick Stats</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Total Products', value: products.length, icon: Package },
                { label: 'Total Bills', value: bills.length, icon: FileText },
                { label: 'Total Customers', value: new Set(bills.map(b => b.customer_id)).size, icon: TrendingUp },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                    <Icon size={14} /> {label}
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const fmt = (d) => d.toISOString().split('T')[0]

// Revenue helpers
export function getRevenue(bills, period) {
  const completed = bills.filter(b => b.type === 'invoice' && b.status === 'completed')
  const now = new Date()
  return completed.filter(b => {
    const d = new Date(b.date)
    if (period === 'daily') return fmt(d) === fmt(now)
    if (period === 'monthly') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    if (period === 'quarterly') {
      const q = Math.floor(now.getMonth() / 3)
      return Math.floor(d.getMonth() / 3) === q && d.getFullYear() === now.getFullYear()
    }
    if (period === 'yearly') return d.getFullYear() === now.getFullYear()
    return true
  }).reduce((sum, b) => sum + b.grand_total, 0)
}

export function getTopProducts(bills) {
  const map = {}
  bills.filter(b => b.type === 'invoice' && b.status === 'completed').forEach(b => {
    b.items.forEach(it => {
      if (!map[it.product_name]) map[it.product_name] = { name: it.product_name, qty: 0, revenue: 0 }
      map[it.product_name].qty += it.quantity
      map[it.product_name].revenue += parseFloat(it.amount)
    })
  })
  return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
}

export function getSalesTrend(bills) {
  const map = {}
  bills.filter(b => b.type === 'invoice' && b.status === 'completed').forEach(b => {
    const label = b.date.slice(0, 10)
    map[label] = (map[label] || 0) + b.grand_total
  })
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({ date, total }))
}

// src/lib/mockData.js
// All mock data used across the app while Supabase is not yet connected

export const mockUser = {
  id: 'user-001',
  email: 'admin@shrutilaminate.com',
}

export const mockProfile = {
  id: 'user-001',
  business_name: 'Shruti Laminate',
  address: 'Kanji Manji Estate, Gala No.B-03, Kala Maidan, N S S Road, Ghatkopar West, Mumbai - 400086',
  phone: '022-25103747 / 02225103748',
  email: 'shrutilaminate19@gmail.com',
  gstin: '27CXSPS8629A1ZV',
  bank_name: 'HDFC Bank',
  bank_account: '50200032654443',
  ifsc_code: 'HDFC0000836',
}

export const mockProducts = [
  { id: 'p1', name: 'SUNMICA PLAIN 8X4 – STANDARD', hsn_sac: '39209919', category: 'Sunmica', price: 980.00, gst_rate: 18, quantity: 200, low_stock_threshold: 30 },
  { id: 'p2', name: 'SUNMICA PLAIN 8X4 – PREMIUM', hsn_sac: '39209919', category: 'Sunmica', price: 1200.00, gst_rate: 18, quantity: 150, low_stock_threshold: 25 },
  { id: 'p3', name: 'SUNMICA GLOSSY 8X4 – STANDARD', hsn_sac: '39209919', category: 'Sunmica', price: 1050.00, gst_rate: 18, quantity: 180, low_stock_threshold: 30 },
  { id: 'p4', name: 'SUNMICA GLOSSY 8X4 – PREMIUM', hsn_sac: '39209919', category: 'Sunmica', price: 1380.00, gst_rate: 18, quantity: 120, low_stock_threshold: 20 },
  { id: 'p5', name: 'SUNMICA MATTE 8X4 – STANDARD', hsn_sac: '39209919', category: 'Sunmica', price: 1100.00, gst_rate: 18, quantity: 18, low_stock_threshold: 25 },
  { id: 'p6', name: 'SUNMICA MATTE 8X4 – PREMIUM', hsn_sac: '39209919', category: 'Sunmica', price: 1450.00, gst_rate: 18, quantity: 90, low_stock_threshold: 20 },
  { id: 'p7', name: 'SUNMICA TEXTURED 8X4', hsn_sac: '39209919', category: 'Sunmica', price: 1250.00, gst_rate: 18, quantity: 75, low_stock_threshold: 15 },
  { id: 'p8', name: 'SUNMICA WOODEN PRINT 8X4', hsn_sac: '39209919', category: 'Sunmica', price: 1550.00, gst_rate: 18, quantity: 8, low_stock_threshold: 15 },
]

export const mockCustomers = [
  { id: 'c1', name: 'Western Plywood', address: '1st Floor, Shop No.15, Janta Timber Market, Shivaji Near Signal, Govandi, Mumbai – 400043', gstin: '27AZGPS9354J1ZM', phone: '9820000001' },
  { id: 'c2', name: 'Mumbai Furniture House', address: 'Shop 22, Kurla Market, Mumbai – 400070', gstin: '27BBBPS0001A1Z1', phone: '9820000002' },
  { id: 'c3', name: 'Krishna Interiors', address: 'Plot 5, MIDC Andheri East, Mumbai – 400093', gstin: '27CCCPS0001A1Z2', phone: '9820000003' },
  { id: 'c4', name: 'Raj Timber & Plywood', address: 'Shop 8, Bhiwandi Timber Market, Bhiwandi – 421302', gstin: '', phone: '9820000004' },
]

// Generate consistent mock bills
const today = new Date()
const fmt = (d) => d.toISOString().split('T')[0]
const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return fmt(d) }

export const mockBills = [
  {
    id: 'b1', bill_number: 407, type: 'invoice', status: 'completed',
    customer_id: 'c1', customer_name: 'Western Plywood',
    customer_address: '1st Floor, Shop No.15, Janta Timber Market, Mumbai', customer_gstin: '27AZGPS9354J1ZM',
    place_of_supply: '27-Maharashtra',
    date: daysAgo(0), subtotal: 38122, total_gst: 6861.96, grand_total: 44984, round_off: 0.04,
    notes: '', converted_from: null,
    items: [{ id: 'bi1', product_id: 'p1', product_name: 'SUNMICA PLAIN 8X4 – STANDARD', hsn_sac: '39209919', quantity: 38.900, rate: 980.00, gst_rate: 18, amount: 45090.2 }]
  },
  {
    id: 'b2', bill_number: 406, type: 'invoice', status: 'completed',
    customer_id: 'c2', customer_name: 'Mumbai Furniture House',
    customer_address: 'Shop 22, Kurla Market, Mumbai', customer_gstin: '27BBBPS0001A1Z1',
    place_of_supply: '27-Maharashtra',
    date: daysAgo(1), subtotal: 24500, total_gst: 4410, grand_total: 28910, round_off: 0,
    notes: '', converted_from: null,
    items: [
      { id: 'bi2', product_id: 'p3', product_name: 'SUNMICA GLOSSY 8X4 – STANDARD', hsn_sac: '39209919', quantity: 15, rate: 1050, gst_rate: 18, amount: 18585 },
      { id: 'bi3', product_id: 'p7', product_name: 'SUNMICA TEXTURED 8X4', hsn_sac: '39209919', quantity: 5, rate: 1250, gst_rate: 18, amount: 7375 },
    ]
  },
  {
    id: 'b3', bill_number: 3, type: 'challan', status: 'pending',
    customer_id: 'c3', customer_name: 'Krishna Interiors',
    customer_address: 'Plot 5, MIDC Andheri East, Mumbai', customer_gstin: '',
    place_of_supply: '27-Maharashtra',
    date: daysAgo(2), subtotal: 19600, total_gst: 3528, grand_total: 23128, round_off: 0,
    notes: 'Approval memo', converted_from: null,
    items: [
      { id: 'bi4', product_id: 'p4', product_name: 'SUNMICA GLOSSY 8X4 – PREMIUM', hsn_sac: '39209919', quantity: 10, rate: 1380, gst_rate: 18, amount: 16284 },
      { id: 'bi5', product_id: 'p2', product_name: 'SUNMICA PLAIN 8X4 – PREMIUM', hsn_sac: '39209919', quantity: 5, rate: 1200, gst_rate: 18, amount: 7080 },
    ]
  },
  {
    id: 'b4', bill_number: 405, type: 'invoice', status: 'completed',
    customer_id: 'c4', customer_name: 'Raj Timber & Plywood',
    customer_address: 'Bhiwandi Timber Market', customer_gstin: '',
    place_of_supply: '27-Maharashtra',
    date: daysAgo(5), subtotal: 55000, total_gst: 9900, grand_total: 64900, round_off: 0,
    notes: '', converted_from: null,
    items: [
      { id: 'bi6', product_id: 'p6', product_name: 'SUNMICA MATTE 8X4 – PREMIUM', hsn_sac: '39209919', quantity: 38, rate: 1450, gst_rate: 18, amount: 65132 },
    ]
  },
  {
    id: 'b5', bill_number: 2, type: 'challan', status: 'converted',
    customer_id: 'c1', customer_name: 'Western Plywood',
    customer_address: '1st Floor, Shop No.15, Janta Timber Market, Mumbai', customer_gstin: '27AZGPS9354J1ZM',
    place_of_supply: '27-Maharashtra',
    date: daysAgo(7), subtotal: 12000, total_gst: 2160, grand_total: 14160, round_off: 0,
    notes: '', converted_from: null,
    items: [
      { id: 'bi7', product_id: 'p8', product_name: 'SUNMICA WOODEN PRINT 8X4', hsn_sac: '39209919', quantity: 8, rate: 1550, gst_rate: 18, amount: 14632 },
    ]
  },
  {
    id: 'b6', bill_number: 404, type: 'invoice', status: 'completed',
    customer_id: 'c3', customer_name: 'Krishna Interiors',
    customer_address: 'Plot 5, MIDC Andheri East, Mumbai', customer_gstin: '',
    place_of_supply: '27-Maharashtra',
    date: daysAgo(10), subtotal: 42000, total_gst: 7560, grand_total: 49560, round_off: 0,
    notes: '', converted_from: 'b5',
    items: [
      { id: 'bi8', product_id: 'p1', product_name: 'SUNMICA PLAIN 8X4 – STANDARD', hsn_sac: '39209919', quantity: 25, rate: 980, gst_rate: 18, amount: 28910 },
      { id: 'bi9', product_id: 'p5', product_name: 'SUNMICA MATTE 8X4 – STANDARD', hsn_sac: '39209919', quantity: 12, rate: 1100, gst_rate: 18, amount: 15576 },
    ]
  },
]

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
      map[it.product_name].revenue += it.amount
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

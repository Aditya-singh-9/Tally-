import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [products, setProducts] = useState([])
  const [parties, setParties] = useState([])
  const [bills, setBills] = useState([])
  const [purchases, setPurchases] = useState([])
  const [transactions, setTransactions] = useState([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setIsAuthenticated(true)
        fetchInitialData(session.user.id)
      } else {
        setLoadingInitial(false)
      }
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        setIsAuthenticated(true)
        fetchInitialData(session.user.id)
      } else {
        setUser(null)
        setIsAuthenticated(false)
        setProfile(null)
        setLoadingInitial(false)
      }
    })

    return () => authListener.subscription.unsubscribe()
  }, [])

  async function fetchInitialData(userId) {
    try {
      const [
        { data: profData },
        { data: prodData },
        { data: partData },
        { data: billData },
        { data: purchData },
        { data: txData }
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('parties').select('*').order('created_at', { ascending: false }),
        supabase.from('bills').select('*, items:bill_items(*)').order('created_at', { ascending: false }),
        supabase.from('purchases').select('*, items:purchase_items(*)').order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').order('date', { ascending: false })
      ])

      setProfile(profData || {})
      setProducts(prodData || [])
      setParties(partData || [])
      setBills(billData || [])
      setPurchases(purchData || [])
      setTransactions(txData || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoadingInitial(false)
    }
  }

  // ── Profile ──────────────────────────────────────────────────
  async function updateProfile(updates) {
    const { data, error } = await supabase.from('profiles').upsert({ 
      id: user.id, 
      ...updates 
    }).select().single()
    if (!error && data) setProfile(data)
  }

  // ── Products ──────────────────────────────────────────────────
  async function addProduct(product) {
    const { data, error } = await supabase.from('products').insert({
      ...product, user_id: user.id
    }).select().single()
    if (!error && data) setProducts(prev => [data, ...prev])
    return data
  }

  async function updateProduct(id, updates) {
    const { error } = await supabase.from('products').update(updates).eq('id', id)
    if (!error) setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  async function deleteProduct(id) {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) setProducts(prev => prev.filter(p => p.id !== id))
  }

  async function deductStock(items) {
    const updates = []
    setProducts(prev => prev.map(p => {
      const item = items.find(it => it.product_id === p.id)
      if (item) {
        const newQ = Math.max(0, p.quantity - item.quantity)
        updates.push({ id: p.id, quantity: newQ })
        return { ...p, quantity: newQ }
      }
      return p
    }))
    // Run db updates
    for (const u of updates) {
      await supabase.from('products').update({ quantity: u.quantity }).eq('id', u.id)
    }
  }

  // ── Parties ─────────────────────────────────────────────────
  async function addParty(party) {
    const { data, error } = await supabase.from('parties').insert({
      ...party, user_id: user.id
    }).select().single()
    if (!error && data) setParties(prev => [data, ...prev])
    return data
  }

  async function updateParty(id, updates) {
    const { error } = await supabase.from('parties').update(updates).eq('id', id)
    if (!error) setParties(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  // ── Transactions ─────────────────────────────────────────────
  async function addTransaction(tx) {
    const { data, error } = await supabase.from('transactions').insert({
      ...tx, user_id: user.id
    }).select().single()
    if (!error && data) setTransactions(prev => [data, ...prev])
    return data
  }

  function getPartyBalance(partyId) {
    const txs = transactions.filter(t => t.party_id === partyId)
    const party = parties.find(p => p.id === partyId)
    if (!party) return 0
    if (party.type === 'customer') {
       return txs.reduce((sum, t) => sum + (t.type === 'invoice' ? parseFloat(t.amount) : t.type === 'receipt' ? -parseFloat(t.amount) : 0), 0)
    } else {
       return txs.reduce((sum, t) => sum + (t.type === 'purchase' ? parseFloat(t.amount) : t.type === 'payment' ? -parseFloat(t.amount) : 0), 0)
    }
  }

  function getPartyTransactions(partyId) {
    return transactions.filter(t => t.party_id === partyId).sort((a,b) => new Date(b.date) - new Date(a.date))
  }

  // ── Purchases ────────────────────────────────────────────────
  async function createPurchase(data) {
    const bill_number = purchases.length > 0 ? Math.max(...purchases.map(p => p.bill_number)) + 1 : 1
    
    // Insert purchase
    const pData = { ...data, bill_number, user_id: user.id }
    delete pData.items
    const { data: newPurchase, error: pErr } = await supabase.from('purchases').insert(pData).select().single()
    if (pErr) throw pErr

    // Insert items
    const itemsData = data.items.map(it => {
      const { id, ...rest } = it // strip temporary id
      return { ...rest, purchase_id: newPurchase.id }
    })
    const { data: newItems } = await supabase.from('purchase_items').insert(itemsData).select()
    
    const purcObj = { ...newPurchase, items: newItems }
    setPurchases(prev => [purcObj, ...prev])
    
    // Add stock optimistically
    const stockUpdates = []
    setProducts(prev => prev.map(p => {
      const item = itemsData.find(it => it.product_id === p.id)
      if (item) {
        const newQ = parseFloat(p.quantity) + parseFloat(item.quantity)
        stockUpdates.push({ id: p.id, quantity: newQ })
        return { ...p, quantity: newQ }
      }
      return p
    }))
    for (const u of stockUpdates) {
      await supabase.from('products').update({ quantity: u.quantity }).eq('id', u.id)
    }

    // Add transaction against supplier
    await addTransaction({
      party_id: newPurchase.party_id,
      date: newPurchase.date,
      type: 'purchase',
      reference: `PUR-${newPurchase.bill_number}`,
      amount: newPurchase.grand_total
    })
    
    return purcObj
  }

  // ── Bills ─────────────────────────────────────────────────────
  function getNextBillNumber(type) {
    const existing = bills.filter(b => b.type === type)
    if (existing.length === 0) return 1
    return Math.max(...existing.map(b => b.bill_number)) + 1
  }

  async function createBill(billData) {
    const bill_number = getNextBillNumber(billData.type)
    
    const bData = { ...billData, bill_number, user_id: user.id }
    delete bData.items
    const { data: newBill, error: bErr } = await supabase.from('bills').insert(bData).select().single()
    if (bErr) throw bErr

    const itemsData = billData.items.map(it => {
      const { id, ...rest } = it
      return { ...rest, bill_id: newBill.id }
    })
    const { data: newItems } = await supabase.from('bill_items').insert(itemsData).select()

    const billObj = { ...newBill, items: newItems }
    setBills(prev => [billObj, ...prev])

    // Deduct stock only for invoices
    if (newBill.type === 'invoice') {
      await deductStock(newItems)
      await addTransaction({
        party_id: newBill.party_id || newBill.customer_id, // ensure party_id mapping
        date: newBill.date,
        type: 'invoice',
        reference: `INV-${newBill.bill_number}`,
        amount: newBill.grand_total
      })
    }
    return billObj
  }

  async function convertChallanToInvoice(challanId) {
    const challan = bills.find(b => b.id === challanId)
    if (!challan) return null

    await supabase.from('bills').update({ status: 'converted' }).eq('id', challanId)
    setBills(prev => prev.map(b => b.id === challanId ? { ...b, status: 'converted' } : b))

    const invoiceData = {
      ...challan,
      bill_number: getNextBillNumber('invoice'),
      type: 'invoice',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      notes: `Converted from Challan DC-${challan.bill_number}`
    }
    delete invoiceData.id
    delete invoiceData.items
    delete invoiceData.created_at

    const { data: invoice, error } = await supabase.from('bills').insert(invoiceData).select().single()
    
    const itemsData = challan.items.map(it => {
      const { id, bill_id, amount, ...rest } = it
      return { ...rest, amount, bill_id: invoice.id }
    })
    const { data: newItems } = await supabase.from('bill_items').insert(itemsData).select()

    const invObj = { ...invoice, items: newItems }
    setBills(prev => [invObj, ...prev])

    await deductStock(newItems)
    await addTransaction({
      party_id: invoice.party_id || invoice.customer_id,
      date: invoice.date,
      type: 'invoice',
      reference: `INV-${invoice.bill_number}`,
      amount: invoice.grand_total
    })
    return invObj
  }

  async function deleteBill(id) {
    await supabase.from('bills').delete().eq('id', id)
    setBills(prev => prev.filter(b => b.id !== id))
  }

  // ── Auth ──────────────────────────────────────────────────────
  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
    setIsAuthenticated(false)
  }

  if (loadingInitial) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner"></div>
    </div>
  }

  return (
    <AppContext.Provider value={{
      user, profile, updateProfile, setProfile,
      products, addProduct, updateProduct, deleteProduct,
      parties, addParty, updateParty,
      purchases, createPurchase,
      transactions, addTransaction, getPartyBalance, getPartyTransactions,
      bills, createBill, convertChallanToInvoice, deleteBill,
      isAuthenticated, logout,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

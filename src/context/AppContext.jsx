// src/context/AppContext.jsx
// Global state — mock data store simulating what Supabase will later provide

import { createContext, useContext, useState } from 'react'
import { mockProducts, mockBills, mockCustomers, mockProfile, mockUser } from '../lib/mockData'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user] = useState(mockUser)
  const [profile, setProfile] = useState(mockProfile)
  const [products, setProducts] = useState(mockProducts)
  const [customers, setCustomers] = useState(mockCustomers)
  const [bills, setBills] = useState(mockBills)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // ── Products ──────────────────────────────────────────────────
  function addProduct(product) {
    const newProduct = { ...product, id: 'p' + Date.now() }
    setProducts(prev => [newProduct, ...prev])
    return newProduct
  }

  function updateProduct(id, updates) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  function deleteProduct(id) {
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  function deductStock(items) {
    setProducts(prev => prev.map(p => {
      const item = items.find(it => it.product_id === p.id)
      return item ? { ...p, quantity: Math.max(0, p.quantity - item.quantity) } : p
    }))
  }

  // ── Customers ─────────────────────────────────────────────────
  function addCustomer(customer) {
    const newCustomer = { ...customer, id: 'c' + Date.now() }
    setCustomers(prev => [newCustomer, ...prev])
    return newCustomer
  }

  // ── Bills ─────────────────────────────────────────────────────
  function getNextBillNumber(type) {
    const existing = bills.filter(b => b.type === type)
    if (existing.length === 0) return type === 'invoice' ? 1 : 1
    return Math.max(...existing.map(b => b.bill_number)) + 1
  }

  function createBill(billData) {
    const newBill = {
      ...billData,
      id: 'b' + Date.now(),
      bill_number: getNextBillNumber(billData.type),
    }
    setBills(prev => [newBill, ...prev])

    // Deduct stock only for invoices
    if (newBill.type === 'invoice') {
      deductStock(newBill.items)
    }
    return newBill
  }

  function convertChallanToInvoice(challanId) {
    const challan = bills.find(b => b.id === challanId)
    if (!challan) return null

    // Mark challan as converted
    setBills(prev => prev.map(b =>
      b.id === challanId ? { ...b, status: 'converted' } : b
    ))

    // Create invoice from challan data
    const invoice = {
      ...challan,
      id: 'b' + Date.now(),
      bill_number: getNextBillNumber('invoice'),
      type: 'invoice',
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      converted_from: challanId,
    }
    setBills(prev => [invoice, ...prev])
    deductStock(challan.items)
    return invoice
  }

  function deleteBill(id) {
    setBills(prev => prev.filter(b => b.id !== id))
  }

  // ── Auth ──────────────────────────────────────────────────────
  function login(email, password) {
    // Mock login — any credentials work
    setIsAuthenticated(true)
    return true
  }

  function logout() {
    setIsAuthenticated(false)
  }

  return (
    <AppContext.Provider value={{
      user, profile, setProfile,
      products, addProduct, updateProduct, deleteProduct,
      customers, addCustomer,
      bills, createBill, convertChallanToInvoice, deleteBill,
      isAuthenticated, login, logout,
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

import { useState } from 'react'
import { useApp } from './context/AppContext'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Billing from './pages/Billing'
import BillHistory from './pages/BillHistory'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Parties from './pages/Parties'
import Purchases from './pages/Purchases'
import AdminDashboard from './pages/AdminDashboard'
import GSTReports from './pages/GSTReports'

const PAGES = {
  dashboard: { component: Dashboard, title: 'Dashboard' },
  admin:     { component: AdminDashboard, title: 'Admin Panel' },
  inventory:  { component: Inventory,  title: 'Inventory' },
  billing:    { component: Billing,    title: 'New Sales Bill' },
  purchases:  { component: Purchases,  title: 'Purchase Voucher' },
  parties:    { component: Parties,    title: 'Parties & Ledgers' },
  history:    { component: BillHistory, title: 'Bill History' },
  gst:        { component: GSTReports, title: 'GST Summary' },
  reports:    { component: Reports,    title: 'Reports & Analytics' },
  settings:   { component: Settings,   title: 'Settings' },
}

export default function App() {
  const { isAuthenticated } = useApp()
  const [currentPage, setCurrentPage] = useState('dashboard')

  if (!isAuthenticated) return <Login />

  const { component: PageComponent, title } = PAGES[currentPage] || PAGES.dashboard

  return (
    <div className="app-shell">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="main-content">
        <TopBar title={title} currentPage={currentPage} onNavigate={setCurrentPage} />
        <div className="page-body animate-fade-in">
          <PageComponent onNavigate={setCurrentPage} />
        </div>
      </div>
    </div>
  )
}

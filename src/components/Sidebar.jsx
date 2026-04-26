import { useApp } from '../context/AppContext'
import {
  LayoutDashboard, Package, FileText, History,
  BarChart2, Settings, LogOut, AlertTriangle, Users, Truck
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory',    icon: Package },
  { id: 'billing',   label: 'Sales Bill',   icon: FileText },
  { id: 'purchases', label: 'Purchases',    icon: Truck },
  { id: 'parties',   label: 'Parties',      icon: Users },
  { id: 'history',   label: 'Bill History', icon: History },
  { id: 'reports',   label: 'Reports',      icon: BarChart2 },
]

export default function Sidebar({ currentPage, onNavigate }) {
  const { user, profile, products, logout } = useApp()

  const lowStockCount = products.filter(p => p.quantity <= p.low_stock_threshold).length

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">T</div>
        <div>
          <div className="sidebar-logo-text">TallySaaS</div>
          <div className="sidebar-logo-sub">Accounting</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Main</div>

        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`sidebar-link ${currentPage === id ? 'active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <Icon className="sidebar-icon" size={18} />
            {label}
            {id === 'inventory' && lowStockCount > 0 && (
              <span className="sidebar-badge">{lowStockCount}</span>
            )}
          </button>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: 20 }}>System</div>

        <button
          className={`sidebar-link ${currentPage === 'settings' ? 'active' : ''}`}
          onClick={() => onNavigate('settings')}
        >
          <Settings className="sidebar-icon" size={18} />
          Settings
        </button>
      </div>

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <div style={{ padding: '0 12px 12px' }}>
          <div style={{
            background: 'var(--yellow-bg)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <AlertTriangle size={14} color="var(--yellow)" />
            <span style={{ fontSize: 12, color: 'var(--yellow)', fontWeight: 500 }}>
              {lowStockCount} low stock item{lowStockCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="user-pill">
          <div className="user-avatar">
            {(profile?.business_name || user?.user_metadata?.business_name || '?').charAt(0)}
          </div>
          <div className="user-info">
            <div className="user-name">{profile?.business_name || user?.user_metadata?.business_name || 'My Business'}</div>
            <div className="user-email">{profile?.email || user?.email || 'admin@business.com'}</div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            title="Logout"
            onClick={logout}
            style={{ padding: 4 }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </nav>
  )
}

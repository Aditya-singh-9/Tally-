import { Bell, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function TopBar({ title, currentPage, onNavigate }) {
  const { products } = useApp()
  const lowStockCount = products.filter(p => p.quantity <= p.low_stock_threshold).length

  return (
    <header className="topbar">
      <div className="topbar-title">{title}</div>

      <div className="topbar-actions">
        {/* Quick new bill button */}
        {currentPage !== 'billing' && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onNavigate('billing')}
          >
            <Plus size={14} />
            New Bill
          </button>
        )}

        {/* Notifications */}
        <button
          className={`btn btn-ghost btn-icon ${lowStockCount > 0 ? 'notif-dot' : ''}`}
          data-tooltip={lowStockCount > 0 ? `${lowStockCount} low stock alerts` : 'Notifications'}
          onClick={() => onNavigate('inventory')}
        >
          <Bell size={18} />
        </button>

        {/* Date */}
        <div style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </header>
  )
}

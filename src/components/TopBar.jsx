import { useState, useRef, useEffect } from 'react'
import { Bell, Plus, Search, X, Package } from 'lucide-react'
import { useApp } from '../context/AppContext'

const fmt = n => new Intl.NumberFormat('en-IN').format(n)

export default function TopBar({ title, currentPage, onNavigate }) {
  const { products } = useApp()
  const lowStockCount = products.filter(p => p.quantity <= p.low_stock_threshold).length

  const [query, setQuery]       = useState('')
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef(null)
  const inputRef  = useRef(null)

  // Filter products by name OR id (partial, case-insensitive)
  const results = query.trim().length >= 1
    ? products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        String(p.id).includes(query.trim())
      ).slice(0, 8)
    : []

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleInput(e) {
    setQuery(e.target.value)
    setShowResults(true)
  }

  function handleClear() {
    setQuery('')
    setShowResults(false)
    inputRef.current?.focus()
  }

  function handleSelect(product) {
    setQuery(product.name)
    setShowResults(false)
    onNavigate('inventory')
  }

  function stockColor(p) {
    if (p.quantity === 0) return 'var(--red)'
    if (p.quantity <= p.low_stock_threshold) return 'var(--yellow)'
    return 'var(--green)'
  }

  function stockLabel(p) {
    if (p.quantity === 0) return 'Out of Stock'
    if (p.quantity <= p.low_stock_threshold) return 'Low'
    return 'In Stock'
  }

  return (
    <header className="topbar">
      <div className="topbar-title">{title}</div>

      {/* ── Global Stock Search ── */}
      <div ref={searchRef} className="topbar-search-wrap">
        <div className="topbar-search-bar">
          <Search size={14} className="topbar-search-icon" />
          <input
            ref={inputRef}
            id="global-stock-search"
            className="topbar-search-input"
            placeholder="Search stock by name or ID…"
            value={query}
            onChange={handleInput}
            onFocus={() => query.trim() && setShowResults(true)}
            onKeyDown={e => {
              if (e.key === 'Escape') { setShowResults(false); setQuery('') }
              if (e.key === 'Enter' && results.length > 0) handleSelect(results[0])
            }}
            autoComplete="off"
          />
          {query && (
            <button className="topbar-search-clear" onClick={handleClear} aria-label="Clear search">
              <X size={13} />
            </button>
          )}
          <button
            id="stock-search-btn"
            className="topbar-search-btn"
            onClick={() => { setShowResults(true); inputRef.current?.focus() }}
          >
            Search
          </button>
        </div>

        {/* Dropdown results */}
        {showResults && query.trim() && (
          <div className="topbar-search-dropdown">
            {results.length === 0 ? (
              <div className="topbar-search-empty">
                <Package size={20} />
                <span>No stock found for "<strong>{query}</strong>"</span>
              </div>
            ) : (
              <>
                <div className="topbar-search-header">
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </div>
                {results.map(p => (
                  <button
                    key={p.id}
                    className="topbar-search-item"
                    onClick={() => handleSelect(p)}
                  >
                    <div className="topbar-search-item-left">
                      <div className="topbar-search-item-name">{p.name}</div>
                      <div className="topbar-search-item-meta">
                        ID: {p.id} &nbsp;·&nbsp; HSN: {p.hsn_sac || '—'} &nbsp;·&nbsp; ₹{fmt(p.price)}
                      </div>
                    </div>
                    <div className="topbar-search-item-right">
                      <span className="topbar-search-qty" style={{ color: stockColor(p) }}>
                        {p.quantity} units
                      </span>
                      <span className="topbar-search-status" style={{ background: stockColor(p) + '22', color: stockColor(p) }}>
                        {stockLabel(p)}
                      </span>
                    </div>
                  </button>
                ))}
                <button className="topbar-search-view-all" onClick={() => { setShowResults(false); onNavigate('inventory') }}>
                  View all inventory →
                </button>
              </>
            )}
          </div>
        )}
      </div>

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

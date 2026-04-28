import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { Shield, Check, X } from 'lucide-react'

export default function AdminDashboard() {
  const { profile, getAllProfiles, updateUserStatus } = useApp()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchUsers()
    }
  }, [profile])

  async function fetchUsers() {
    setLoading(true)
    const data = await getAllProfiles()
    setUsers(data)
    setLoading(false)
  }

  async function handleStatusChange(id, newStatus) {
    await updateUserStatus(id, newStatus)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u))
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Shield size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h2>Access Denied</h2>
          <p>You do not have permission to view this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={20} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Manage user approvals and access</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Business Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px', fontWeight: 500 }}>{u.business_name}</td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      fontSize: 12, padding: '2px 8px', borderRadius: 12, fontWeight: 600,
                      background: u.role === 'admin' ? 'var(--accent-light-bg)' : 'var(--bg-secondary)',
                      color: u.role === 'admin' ? 'var(--accent)' : 'var(--text-secondary)'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{ 
                      fontSize: 12, padding: '4px 10px', borderRadius: 12, fontWeight: 600,
                      background: u.status === 'approved' ? 'var(--green-bg)' : 'var(--yellow-bg)',
                      color: u.status === 'approved' ? 'var(--green)' : 'var(--yellow)'
                    }}>
                      {u.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    {u.status !== 'approved' && (
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '6px 12px', fontSize: 13, background: 'var(--green)' }}
                        onClick={() => handleStatusChange(u.id, 'approved')}
                      >
                        <Check size={14} style={{ marginRight: 4 }} /> Approve
                      </button>
                    )}
                    {u.status === 'approved' && u.id !== profile.id && (
                       <button 
                       className="btn btn-ghost" 
                       style={{ padding: '6px 12px', fontSize: 13, color: 'var(--red)' }}
                       onClick={() => handleStatusChange(u.id, 'pending')}
                     >
                       <X size={14} style={{ marginRight: 4 }} /> Revoke
                     </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--text-secondary)' }}>No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

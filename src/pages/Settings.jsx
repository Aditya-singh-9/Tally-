import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Save, Building2, Zap } from 'lucide-react'

export default function Settings() {
  const { profile, updateProfile } = useApp()
  const [form, setForm] = useState({ 
    business_name: profile?.business_name || 'SHRUTI LAMINATE',
    address: profile?.address || 'KANJI MANJI ESTATE,GALA NO,B-03,KALA MAIDAN,N S S ROAD, GHATKOPAR WEST',
    phone: profile?.phone || '022-25103747 / 02225103748',
    email: profile?.email || 'shrutilaminate19@gmail.com',
    gstin: profile?.gstin || '27CXSPS8629A1ZV',
    bank_name: profile?.bank_name || 'H D F C BANK',
    bank_account: profile?.bank_account || '50200032654443',
    ifsc_code: profile?.ifsc_code || 'HDFC0000836',
    ...profile 
  })
  const [saved, setSaved] = useState(false)
  const [gstApiKey, setGstApiKey] = useState(localStorage.getItem('gst_api_key') || '')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave(e) {
    e.preventDefault()
    try {
      await updateProfile(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch(err) {
      alert("Failed to save settings: " + err.message)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Business profile used on invoices and challans</p>
      </div>

      <form onSubmit={handleSave}>
        <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 900 }}>
          {/* Business Info */}
          <div className="card">
            <div className="card-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Building2 size={14} /> Business Information
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Business Name *</label>
                <input id="set-business-name" className="form-input" value={form.business_name}
                  onChange={e => set('business_name', e.target.value)} placeholder="Your Business Name" />
              </div>
              <div className="form-group">
                <label className="form-label">GSTIN</label>
                <input id="set-gstin" className="form-input" value={form.gstin}
                  onChange={e => set('gstin', e.target.value)} placeholder="27XXXXX0000X0XX" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input id="set-phone" className="form-input" value={form.phone}
                  onChange={e => set('phone', e.target.value)} placeholder="022-XXXXXXXX" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input id="set-email" className="form-input" type="email" value={form.email}
                  onChange={e => set('email', e.target.value)} placeholder="you@business.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea id="set-address" className="form-textarea" value={form.address}
                  onChange={e => set('address', e.target.value)} rows={3}
                  placeholder="Full business address" />
              </div>
            </div>
          </div>

          {/* Bank Info */}
          <div className="card">
            <div className="card-title">Bank Details (shown on invoices)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input id="set-bank-name" className="form-input" value={form.bank_name}
                  onChange={e => set('bank_name', e.target.value)} placeholder="HDFC Bank" />
              </div>
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input id="set-account" className="form-input" value={form.bank_account}
                  onChange={e => set('bank_account', e.target.value)} placeholder="XXXXXXXXXXXXXXX" />
              </div>
              <div className="form-group">
                <label className="form-label">IFSC Code</label>
                <input id="set-ifsc" className="form-input" value={form.ifsc_code}
                  onChange={e => set('ifsc_code', e.target.value)} placeholder="HDFC0000000" />
              </div>

              {/* Preview */}
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.8,
                marginTop: 8,
              }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Invoice Header Preview</div>
                <div style={{ fontWeight: 700, color: 'var(--accent-light)', fontSize: 15 }}>{form.business_name || 'Your Business'}</div>
                <div>{form.address}</div>
                <div>{form.phone} · {form.email}</div>
                <div style={{ marginTop: 6 }}>GSTIN: <strong>{form.gstin || 'Not set'}</strong></div>
                <div>Bank: {form.bank_name} · A/C: {form.bank_account} · IFSC: {form.ifsc_code}</div>
              </div>
            </div>
          </div>
        </div>

        {/* GST Auto-Fetch Settings */}
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-title flex items-center gap-2">
            <Zap size={18} color="var(--accent)" /> GSTIN Auto-Fetch API Integration
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Connect a 3rd-party GST verification API (like Razorpay or Masters India) to automatically pull Business Names and Addresses when you type a GSTIN.
          </p>
          <div className="form-group">
            <label className="form-label">API Key (Saved securely on your device)</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <input 
                type="password" 
                className="form-input" 
                value={gstApiKey} 
                onChange={e => setGstApiKey(e.target.value)} 
                placeholder="Paste your API key here..." 
                style={{ flex: 1 }}
              />
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={() => {
                  localStorage.setItem('gst_api_key', gstApiKey)
                  alert('API Key saved locally.')
                }}
              >
                Save Key
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button id="save-settings" type="submit" className="btn btn-primary btn-lg">
            <Save size={16} /> Save Settings
          </button>
          {saved && (
            <span style={{ color: 'var(--green)', fontSize: 14, fontWeight: 600 }}>
              ✓ Settings saved!
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

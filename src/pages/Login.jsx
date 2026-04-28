import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, Zap } from 'lucide-react'

export default function Login() {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [business, setBusiness] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Listen for custom auth errors from AppContext
  import { useEffect } from 'react'
  useEffect(() => {
    const handleAuthError = (e) => {
      setError(e.detail)
    }
    window.addEventListener('auth-error', handleAuthError)
    return () => window.removeEventListener('auth-error', handleAuthError)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please fill in all fields.'); return }
    if (isSignup && !business) { setError('Please enter your business name.'); return }
    
    setLoading(true)
    
    if (isSignup) {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            business_name: business
          }
        }
      })
      
      if (authError) {
        setError(authError.message)
      } else {
        setSuccess('Account created! Please wait for an admin to approve your account before you can sign in.')
      }
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) {
        setError(authError.message)
      }
    }
    
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
          }}>
            <Zap size={26} color="#fff" fill="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>TallySaaS</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {isSignup ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isSignup && (
            <div className="form-group">
              <label className="form-label">Business Name</label>
              <input
                id="business-name"
                className="form-input"
                placeholder="e.g. Shruti Laminate"
                value={business}
                onChange={e => setBusiness(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="email"
              className="form-input"
              type="email"
              placeholder="you@business.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus={!isSignup}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                className="form-input"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: 6 }}
                onClick={() => setShowPass(v => !v)}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'var(--red-bg)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              color: 'var(--red)',
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              background: 'var(--green-bg)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              color: 'var(--green)',
              fontSize: 13,
            }}>
              {success}
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px 0', marginTop: 4, fontSize: 15 }}
          >
            {loading ? (
              <><div className="spinner" style={{ width: 16, height: 16 }} /> Please wait...</>
            ) : isSignup ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            className="btn btn-ghost"
            style={{ padding: '2px 6px', fontSize: 13, color: 'var(--accent-light)' }}
            onClick={() => { setIsSignup(v => !v); setError(''); setSuccess('') }}
          >
            {isSignup ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  )
}

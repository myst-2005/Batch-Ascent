
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, User, AlertCircle, Phone, ArrowRight } from 'lucide-react'
import styles from './page.module.css'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPhoneInput, setShowPhoneInput] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [pendingUser, setPendingUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const generateNextSalesId = async (school: string) => {
    let prefix = 'EX'
    if (school === 'Tech School') prefix = 'TS'
    else if (school === 'Marketing School') prefix = 'MS'
    else if (school === 'Design School') prefix = 'DS'
    else if (school === 'Finance School') prefix = 'FS'

    // Get all existing sales IDs for this school/prefix to ensure uniqueness
    const { data } = await supabase
      .from('users')
      .select('sales_id')
      .eq('school', school)
      .eq('role', 'SALES')

    let maxNum = 0

    if (data) {
      data.forEach((user: any) => {
        if (user.sales_id && user.sales_id.startsWith(prefix)) {
          const parts = user.sales_id.split('-')
          if (parts.length === 2) {
            const num = parseInt(parts[1])
            if (!isNaN(num) && num > maxNum) maxNum = num
          }
        }
      })
    }

    const nextNum = maxNum + 1
    return `${prefix}-${nextNum.toString().padStart(2, '0')}`
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        throw authError
      }

      // 2. Fetch User Details from public.users table
      if (authData.user) {
        const { data: usersData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .limit(1)

        if (userError) throw userError

        const userData = usersData?.[0]

        if (userData) {
          // Check for PENDING role
          if (userData.role === 'PENDING') {
            await supabase.auth.signOut()
            throw new Error('Waiting for approval from Admin.')
          }

          // CHECK FOR SALES ROLE & MISSING PHONE
          if (userData.role === 'SALES' && !userData.phone) {
            setPendingUser(userData)
            setShowPhoneInput(true)
            setLoading(false)
            return
          }

          // If Sales role and phone exists but NO Sales ID, generate it now (Automatic fix)
          if (userData.role === 'SALES' && userData.phone && !userData.sales_id) {
            const newSalesId = await generateNextSalesId(userData.school)
            await supabase.from('users').update({ sales_id: newSalesId }).eq('id', userData.id)
            userData.sales_id = newSalesId
          }

          // Role is automatically determined from database
          localStorage.setItem('userRole', userData.role)
          localStorage.setItem('userName', userData.name)
          if (userData.school) localStorage.setItem('userSchool', userData.school)
          else localStorage.removeItem('userSchool')

          // Store sales_id for SALES role
          if (userData.sales_id) localStorage.setItem('salesId', userData.sales_id)
          else localStorage.removeItem('salesId')

          fetch('/api/log-activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: authData.user.id,
              user_name: userData.name,
              user_email: userData.email,
              user_role: userData.role,
              action: 'LOGIN',
              details: { school: userData.school || null }
            })
          }).catch(() => {}) // fire and forget

          router.push('/dashboard')
        }
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Invalid credentials')
      setLoading(false)
    }
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber) {
      setError('Phone number is required')
      return
    }
    setLoading(true)
    setError('')

    try {
      // Generate Sales ID
      const salesId = await generateNextSalesId(pendingUser.school)

      // Update User
      const { error: updateError } = await supabase
        .from('users')
        .update({
          phone: phoneNumber,
          sales_id: salesId
        })
        .eq('id', pendingUser.id)

      if (updateError) throw updateError

      // Proceed to Dashboard
      localStorage.setItem('userRole', pendingUser.role)
      localStorage.setItem('userName', pendingUser.name)
      if (pendingUser.school) localStorage.setItem('userSchool', pendingUser.school)
      localStorage.setItem('salesId', salesId)

      fetch('/api/log-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: pendingUser.id,
          user_name: pendingUser.name,
          user_email: pendingUser.email,
          user_role: pendingUser.role,
          action: 'LOGIN',
          details: { school: pendingUser.school || null, first_login: true }
        })
      }).catch(() => {})

      router.push('/dashboard')

    } catch (err: any) {
      console.error('Phone update error:', err)
      setError(err.message || 'Failed to update phone number')
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={`card glass ${styles.loginCard} animate-fade-in`}>
        <div className={styles.header}>
          <div style={{
            width: '200px',
            height: '200px',
            margin: '0 auto 1.5rem',
            position: 'relative'
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-new.png"
              alt="Batch Ascent Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '16px'
              }}
            />
          </div>
          <p className={styles.subtitle}>Streamlined Batch Management</p>
        </div>



        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)', fontSize: '0.875rem' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {showPhoneInput ? (
          <form onSubmit={handlePhoneSubmit} className={styles.form}>
            <div className="mb-4 text-center">
              <p className="text-sm text-gray-500 mb-2">Please verify your phone number to generate your Sales ID.</p>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Phone Number</label>
              <div className={styles.inputWrapper}>
                <Phone className={styles.icon} />
                <input
                  type="tel"
                  className={`input ${styles.inputWithIcon}`}
                  placeholder="Enter phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Generating Sales ID...' : 'Complete Setup'} <ArrowRight size={16} style={{ marginLeft: '8px' }} />
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button type="button" onClick={() => { setShowPhoneInput(false); setPendingUser(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem' }}>
                Back to Login
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className={styles.form}>


            <div className={styles.inputGroup}>
              <label className={styles.label}>Email Address</label>
              <div className={styles.inputWrapper}>
                <User className={styles.icon} />
                <input
                  type="email"
                  className={`input ${styles.inputWithIcon}`}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className={styles.label} style={{ marginBottom: 0 }}>Password</label>
                <a href="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>Forgot Password?</a>
              </div>
              <div className={styles.inputWrapper}>
                <Lock className={styles.icon} />
                <input
                  type="password"
                  className={`input ${styles.inputWithIcon}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Don't have an account? <a href="/signup" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>Sign Up</a>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

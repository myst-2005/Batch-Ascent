
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, User, AlertCircle } from 'lucide-react'
import styles from './page.module.css'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

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
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single()

        if (userError) throw userError

        if (userData) {
          // Check for PENDING role
          if (userData.role === 'PENDING') {
            await supabase.auth.signOut()
            throw new Error('Waiting for approval from Admin.')
          }

          // Role is automatically determined from database
          localStorage.setItem('userRole', userData.role)
          localStorage.setItem('userName', userData.name)
          if (userData.school) localStorage.setItem('userSchool', userData.school)
          else localStorage.removeItem('userSchool')

          // Store sales_id for SALES role
          if (userData.sales_id) localStorage.setItem('salesId', userData.sales_id)
          else localStorage.removeItem('salesId')

          router.push('/dashboard')
        }
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Invalid credentials')
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

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Sign In
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Don't have an account? <a href="/signup" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>Sign Up</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

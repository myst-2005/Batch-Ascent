'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Mail, ArrowLeft, AlertCircle } from 'lucide-react'
import styles from '../page.module.css'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            })

            if (error) throw error

            setSuccess(true)
        } catch (err: any) {
            console.error('Reset error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className={styles.container}>
                <div className={`card glass ${styles.loginCard} animate-fade-in`} style={{ textAlign: 'center' }}>
                    <div style={{ width: '120px', height: '120px', margin: '0 auto 1.5rem', position: 'relative' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo-new.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} />
                    </div>
                    <div style={{ color: '#22c55e', marginBottom: '1rem' }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Check your email</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        We've sent a password reset link to <strong>{email}</strong>.
                    </p>
                    <Link href="/" className="btn btn-primary" style={{ display: 'inline-block', width: '100%' }}>
                        Back to Login
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={`card glass ${styles.loginCard} animate-fade-in`}>
                <div className={styles.header}>
                    <Link href="/" style={{ position: 'absolute', left: '1.5rem', top: '1.5rem', color: 'var(--text-secondary)' }}>
                        <ArrowLeft size={20} />
                    </Link>

                    <div style={{ width: '150px', height: '150px', margin: '0 auto 1rem' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo-new.png" alt="Batch Ascent Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} />
                    </div>

                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Reset Password</h2>
                    <p className={styles.subtitle}>Enter your email to receive instructions</p>
                </div>

                {error && (
                    <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626', fontSize: '0.875rem' }}>
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleReset} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Email Address</label>
                        <div className={styles.inputWrapper}>
                            <Mail className={styles.icon} size={20} />
                            <input
                                name="email"
                                type="email"
                                placeholder="Enter your email"
                                className={`input ${styles.inputWithIcon}`}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '0.5rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Sending Link...' : 'Send Reset Link'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Remember password? <Link href="/" style={{ color: 'var(--primary)', fontWeight: '600' }}>Login</Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    )
}

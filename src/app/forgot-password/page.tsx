'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, ArrowLeft, AlertCircle, Lock, KeyRound } from 'lucide-react'
import styles from '../page.module.css'

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [step, setStep] = useState<'email' | 'verify'>('email')
    const [email, setEmail] = useState('')
    const [code, setCode] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // ── Step 1: send the OTP code (custom flow via /api/auth/send-reset-otp) ──
    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await fetch('/api/auth/send-reset-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Could not send the code')
            setStep('verify')
        } catch (err: any) {
            console.error('Reset error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // ── Step 2: verify the OTP code + set the new password ──
    const handleVerifyAndReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/auth/verify-reset-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: code.trim(), password }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Could not reset the password')

            alert('Password updated successfully! Please log in with your new password.')
            router.push('/')
        } catch (err: any) {
            console.error('Verify error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const resend = async () => {
        setError('')
        setLoading(true)
        try {
            const res = await fetch('/api/auth/send-reset-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Could not resend the code')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.container}>
            <div className={`card glass ${styles.loginCard} animate-fade-in`}>
                <div className={styles.header}>
                    <button
                        onClick={() => (step === 'verify' ? setStep('email') : router.push('/'))}
                        style={{ position: 'absolute', left: '1.5rem', top: '1.5rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                        aria-label="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div style={{ width: '150px', height: '150px', margin: '0 auto 1rem' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo-new.png" alt="Batch Ascent Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} />
                    </div>

                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Reset Password</h2>
                    <p className={styles.subtitle}>
                        {step === 'email'
                            ? 'Enter your email to receive a reset code'
                            : `Enter the 6-digit code sent to ${email}`}
                    </p>
                </div>

                {error && (
                    <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626', fontSize: '0.875rem' }}>
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {step === 'email' ? (
                    <form onSubmit={handleSendCode} className={styles.form}>
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
                            {loading ? 'Sending Code...' : 'Send Reset Code'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                Remember password? <Link href="/" style={{ color: 'var(--primary)', fontWeight: '600' }}>Login</Link>
                            </p>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyAndReset} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Reset Code</label>
                            <div className={styles.inputWrapper}>
                                <KeyRound className={styles.icon} size={20} />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    placeholder="6-digit code"
                                    className={`input ${styles.inputWithIcon}`}
                                    value={code}
                                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                                    required
                                    style={{ letterSpacing: '0.3em' }}
                                />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>New Password</label>
                            <div className={styles.inputWrapper}>
                                <Lock className={styles.icon} size={20} />
                                <input
                                    type="password"
                                    placeholder="New password"
                                    className={`input ${styles.inputWithIcon}`}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Confirm New Password</label>
                            <div className={styles.inputWrapper}>
                                <Lock className={styles.icon} size={20} />
                                <input
                                    type="password"
                                    placeholder="Confirm new password"
                                    className={`input ${styles.inputWithIcon}`}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '0.5rem' }}
                            disabled={loading}
                        >
                            {loading ? 'Updating...' : 'Reset Password'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                Didn&apos;t get a code?{' '}
                                <button type="button" onClick={resend} disabled={loading} style={{ color: 'var(--primary)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}>
                                    Resend
                                </button>
                            </p>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}

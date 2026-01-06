'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Lock, User, Mail, Briefcase, School, ArrowLeft, AlertCircle } from 'lucide-react'
import styles from '../page.module.css'
import { SCHOOLS } from '@/lib/constants'

const ALLOWED_ROLES = [
    { label: 'Sales Executive', value: 'SALES' },
    { label: 'SHO', value: 'SHO' },
    { label: 'SSHO', value: 'SSHO' },
    { label: 'Sales Head', value: 'SALES_HEAD' },
    { label: 'Academic Lead', value: 'ACADEMIC_LEAD' },
    { label: 'Project Lead', value: 'PROJECT_LEAD' }
]

export default function SignupPage() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        role: 'SALES',
        school: ''
    })
    const [loading, setLoading] = useState(false)
    const [schoolsList, setSchoolsList] = useState<any[]>([])

    useEffect(() => {
        const fetchSchools = async () => {
            try {
                const { data, error } = await supabase.from('schools').select('*').order('name')
                if (data && data.length > 0) {
                    setSchoolsList(data)
                    setFormData(prev => ({ ...prev, school: data[0].name }))
                } else {
                    setSchoolsList(SCHOOLS.map(s => ({ name: s })))
                    setFormData(prev => ({ ...prev, school: SCHOOLS[0] }))
                }
            } catch (err) {
                console.error('Error fetching schools:', err)
                setSchoolsList(SCHOOLS.map(s => ({ name: s })))
            }
        }
        fetchSchools()
    }, [])

    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const router = useRouter()

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // 1. Sign Up with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        name: formData.name,
                        requested_role: formData.role,
                        school: formData.school // Pass school to Trigger
                    }
                }
            })

            if (authError) throw authError

            // 2. Create Profile in public.users table (Status: PENDING)
            // Note: We use the Trigger (enable_signup.sql) for reliable insertion.
            // But we keep this manual insert as a fallback for Client-Side testing if Trigger isn't active.
            if (authData.user) {
                const { error: dbError } = await supabase
                    .from('users')
                    .insert({
                        id: authData.user.id,
                        email: formData.email,
                        name: formData.name,
                        role: 'PENDING',
                        requested_role: formData.role,
                        school: formData.school
                    })

                if (dbError) {
                    console.warn('DB Insert warning (likely handled by trigger):', dbError)
                }
            }

            setSuccess(true)
        } catch (err: any) {
            console.error('Signup error:', err)
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
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Registration Successful!</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        Your account has been created and is pending approval from Admin.
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

                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Create Account</h2>
                    <p className={styles.subtitle}>Join the Batch Ascent Team</p>
                </div>

                {error && (
                    <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626', fontSize: '0.875rem' }}>
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Full Name</label>
                        <div className={styles.inputWrapper}>
                            <User className={styles.icon} size={20} />
                            <input
                                name="name"
                                type="text"
                                placeholder="Enter your name"
                                className={`input ${styles.inputWithIcon}`}
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Email Address</label>
                        <div className={styles.inputWrapper}>
                            <Mail className={styles.icon} size={20} />
                            <input
                                name="email"
                                type="email"
                                placeholder="Enter your email"
                                className={`input ${styles.inputWithIcon}`}
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Password</label>
                        <div className={styles.inputWrapper}>
                            <Lock className={styles.icon} size={20} />
                            <input
                                name="password"
                                type="password"
                                placeholder="Create a password"
                                className={`input ${styles.inputWithIcon}`}
                                value={formData.password}
                                onChange={handleChange}
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Role</label>
                        <div className={styles.inputWrapper}>
                            <Briefcase className={styles.icon} size={20} />
                            <select
                                name="role"
                                className={`input ${styles.inputWithIcon}`}
                                value={formData.role}
                                onChange={handleChange}
                                required
                                style={{ background: 'transparent' }}
                            >
                                {ALLOWED_ROLES.map(role => (
                                    <option key={role.value} value={role.value}>{role.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>School</label>
                        <div className={styles.inputWrapper}>
                            <School className={styles.icon} size={20} />
                            <select
                                name="school"
                                className={`input ${styles.inputWithIcon}`}
                                value={formData.school}
                                onChange={handleChange}
                                required
                                style={{ background: 'transparent' }}
                            >
                                {schoolsList.map(school => (
                                    <option key={school.id || school.name} value={school.name}>{school.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '0.5rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Already have an account? <Link href="/" style={{ color: 'var(--primary)', fontWeight: '600' }}>Login</Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    )
}

'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Lock, Phone } from 'lucide-react'

export default function UpdatePasswordPage() {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [needsPhone, setNeedsPhone] = useState(false)
    const [userData, setUserData] = useState<any>(null)

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                // Fetch Profile from DB to check status/role/sales_id
                const { data: profile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    setUserData(profile)
                    // If SALES and NO sales_id, we need phone to generate ID
                    if (profile.role === 'SALES' && !profile.sales_id) {
                        setNeedsPhone(true)
                    }
                } else if (user.user_metadata?.role === 'SALES') {
                    // Fallback for Invite flow if DB record missing (unlikely if trigger works, but safe)
                    setNeedsPhone(true)
                }
            }
        }
        init()
    }, [])

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // 1. Update Password
            const { error } = await supabase.auth.updateUser({ password })
            if (error) throw error

            // 2. Handle Sales ID Generation if needed
            if (needsPhone && phone) {
                const { data: { user } } = await supabase.auth.getUser()
                // Use profile data or metadata
                const role = userData?.role || user?.user_metadata?.role
                const school = userData?.school || user?.user_metadata?.school || ''

                // Double check if role is indeed SALES (redundant but safe)
                if (role === 'SALES') {
                    // Logic to Generate ID
                    let schoolPrefix = 'SALES'
                    if (school.toLowerCase().includes('tech')) schoolPrefix = 'TS'
                    else if (school.toLowerCase().includes('design')) schoolPrefix = 'DS'
                    else if (school.toLowerCase().includes('marketing')) schoolPrefix = 'MS'
                    else if (school.toLowerCase().includes('finance')) schoolPrefix = 'FS'

                    const { count } = await supabase
                        .from('users')
                        .select('*', { count: 'exact', head: true })
                        .eq('role', 'SALES')
                        .eq('school', school)
                        .not('sales_id', 'is', null)

                    const salesNumber = (count || 0) + 1
                    const salesId = `${schoolPrefix}${String(salesNumber).padStart(3, '0')}`

                    await supabase
                        .from('users')
                        .update({
                            sales_id: salesId,
                            phone: phone
                        })
                        .eq('id', user?.id)
                }
            }

            alert('Password updated successfully!')
            router.push('/')
        } catch (error: any) {
            alert('Error updating password: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--background)'
        }}>
            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        background: 'var(--primary)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem',
                        color: 'white'
                    }}>
                        <Lock size={24} />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Set New Password</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Enter your new password below.</p>
                </div>

                <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>New Password</label>
                        <input
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            required
                            minLength={6}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    {needsPhone && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                                Phone Number (Required for Sales ID)
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="tel"
                                    className="input"
                                    placeholder="+1234567890"
                                    required
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    style={{ paddingLeft: '40px' }}
                                />
                            </div>
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Updating...' : 'Set Password'}
                    </button>
                </form>
            </div>
        </div>
    )
}

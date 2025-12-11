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
    const [userRole, setUserRole] = useState<string | null>(null)


    useEffect(() => {
        // Fetch user role from Auth metadata (set during invitation)
        const fetchUserRole = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.user_metadata?.role) {
                setUserRole(user.user_metadata.role)
            }
        }
        fetchUserRole()
    }, [])

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase.auth.updateUser({ password })
            if (error) throw error

            // Get current user and metadata
            const { data: { user } } = await supabase.auth.getUser()
            if (user && user.email) {
                // Get user data from metadata (set during invitation)
                const name = user.user_metadata?.name || 'User'
                const role = user.user_metadata?.role || 'SHO'
                const school = user.user_metadata?.school || ''

                const updateData: any = {
                    id: user.id,
                    email: user.email,
                    name: name,
                    role: role,
                    school: school,
                    password: 'SECURE_HASH'
                }

                // If SALES role and phone provided, generate sales_id
                if (role === 'SALES' && phone) {
                    // Determine school prefix
                    let schoolPrefix = 'SALES'
                    if (school.toLowerCase().includes('tech')) schoolPrefix = 'TS'
                    else if (school.toLowerCase().includes('design')) schoolPrefix = 'DS'
                    else if (school.toLowerCase().includes('marketing')) schoolPrefix = 'MS'
                    else if (school.toLowerCase().includes('finance')) schoolPrefix = 'FS'

                    // Get count of existing sales users from this school
                    const { count } = await supabase
                        .from('users')
                        .select('*', { count: 'exact', head: true })
                        .eq('role', 'SALES')
                        .eq('school', school)
                        .not('sales_id', 'is', null)

                    const salesNumber = (count || 0) + 1
                    const salesId = `${schoolPrefix}${String(salesNumber).padStart(3, '0')}`

                    updateData.sales_id = salesId
                    updateData.phone = phone
                }

                // Use upsert to create or update the user record
                const { error: dbError } = await supabase.from('users').upsert(updateData)

                if (dbError) {
                    console.error('Database error:', dbError)
                    throw new Error('Failed to save user data')
                }
            }

            alert('Password updated successfully! You can now login.')
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
                    <p style={{ color: 'var(--text-secondary)' }}>Please create a secure password for your account.</p>
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

                    {userRole === 'SALES' && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                                Phone Number
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
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                Your Sales ID will be auto-generated after setup
                            </p>
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

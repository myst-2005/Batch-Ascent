'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Users, TrendingUp, CheckCircle } from 'lucide-react'

interface Batch {
    id: string
    name: string
    course: string
    start_date: string
    strength: number
    enrolled_count?: number
}

interface SalesStats {
    total_enrollments: number
    this_month: number
}

export default function SalesDashboard() {
    const router = useRouter()
    const [batches, setBatches] = useState<Batch[]>([])
    const [stats, setStats] = useState<SalesStats>({ total_enrollments: 0, this_month: 0 })
    const [loading, setLoading] = useState(true)
    const [userSchool, setUserSchool] = useState<string | null>(null)
    const [salesId, setSalesId] = useState<string | null>(null)

    const [userRole, setUserRole] = useState<string | null>(null)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setUserSchool(localStorage.getItem('userSchool'))
            setSalesId(localStorage.getItem('salesId'))
            setUserRole(localStorage.getItem('userRole'))
        }
        fetchBatches()
    }, [])

    useEffect(() => {
        if (userSchool) fetchStats()
    }, [userSchool, userRole, salesId]) // Re-fetch stats when school/role/salesId is available

    // Real-time subscription for User Profile updates (specifically Sales ID)
    useEffect(() => {
        const fetchUserProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // Initial fetch to ensure we have latest data
                const { data: userData } = await supabase
                    .from('users')
                    .select('sales_id')
                    .eq('id', user.id)
                    .single()

                if (userData && userData.sales_id && userData.sales_id !== salesId) {
                    setSalesId(userData.sales_id)
                    localStorage.setItem('salesId', userData.sales_id)
                }

                // Subscribe to changes
                const channel = supabase
                    .channel('user-profile-updates')
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'users',
                            filter: `id=eq.${user.id}`
                        },
                        (payload) => {
                            const newSalesId = payload.new.sales_id
                            if (newSalesId && newSalesId !== salesId) {
                                console.log('Realtime update: Sales ID changed to', newSalesId)
                                setSalesId(newSalesId)
                                localStorage.setItem('salesId', newSalesId)
                            }
                        }
                    )
                    .subscribe()

                return () => {
                    supabase.removeChannel(channel)
                }
            }
        }

        fetchUserProfile()
    }, [])

    const fetchBatches = async () => {
        try {
            const school = localStorage.getItem('userSchool')

            let query = supabase
                .from('batches')
                .select('*')
                .order('start_date', { ascending: false })

            if (school) {
                query = query.eq('school', school)
            }

            const { data, error } = await query

            if (error) throw error

            // Fetch enrollment counts for each batch
            const batchesWithCounts = await Promise.all(data.map(async (batch) => {
                const { count } = await supabase
                    .from('student_batches')
                    .select('*', { count: 'exact', head: true })
                    .eq('batch_id', batch.id)

                return { ...batch, enrolled_count: count || 0 }
            }))

            setBatches(batchesWithCounts)
        } catch (error) {
            console.error('Error fetching batches:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchStats = async () => {
        try {
            const role = localStorage.getItem('userRole')
            const school = localStorage.getItem('userSchool')
            const salesIdValue = localStorage.getItem('salesId')

            if (role === 'SALES_HEAD' && school) {
                // Fetch all batches for this school first
                const { data: schoolBatches } = await supabase
                    .from('batches')
                    .select('id')
                    .eq('school', school)

                if (schoolBatches && schoolBatches.length > 0) {
                    const batchIds = schoolBatches.map(b => b.id)

                    // Total School Enrollments
                    const { count: totalCount } = await supabase
                        .from('student_batches')
                        .select('*', { count: 'exact', head: true })
                        .in('batch_id', batchIds)

                    // This Month School Enrollments
                    const startOfMonth = new Date()
                    startOfMonth.setDate(1)
                    startOfMonth.setHours(0, 0, 0, 0)

                    const { count: monthCount } = await supabase
                        .from('student_batches')
                        .select('*', { count: 'exact', head: true })
                        .in('batch_id', batchIds)
                        .gte('linked_at', startOfMonth.toISOString()) // Assuming linked_at is used for enrollment time

                    setStats({
                        total_enrollments: totalCount || 0,
                        this_month: monthCount || 0
                    })
                }
            } else if (salesIdValue) {
                // Original logic for SALES role
                const { count: totalCount } = await supabase
                    .from('sales_enrollments')
                    .select('*', { count: 'exact', head: true })
                    .eq('sales_id', salesIdValue)

                const startOfMonth = new Date()
                startOfMonth.setDate(1)
                startOfMonth.setHours(0, 0, 0, 0)

                const { count: monthCount } = await supabase
                    .from('sales_enrollments')
                    .select('*', { count: 'exact', head: true })
                    .eq('sales_id', salesIdValue)
                    .gte('enrolled_at', startOfMonth.toISOString())

                setStats({
                    total_enrollments: totalCount || 0,
                    this_month: monthCount || 0
                })
            }
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }

    if (loading) return <div>Loading...</div>

    return (
        <div className="animate-fade-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Sales Dashboard</h2>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', background: 'var(--primary)', borderRadius: '0.5rem', color: 'white' }}>
                            <Users size={24} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                {userRole === 'SALES_HEAD' ? 'School Enrollments' : 'Total Enrollments'}
                            </p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.total_enrollments}</p>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', background: '#10b981', borderRadius: '0.5rem', color: 'white' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>This Month</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.this_month}</p>
                        </div>
                    </div>
                </div>

                {/* Only show Sales ID card for SALES role */}
                {userRole === 'SALES' && (
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Your Sales ID</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>{salesId || 'Not assigned'}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Use this ID when filling enrollment forms</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Batches Table */}
            <div className="card">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Available Batches - {userSchool}</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1rem' }}>Batch ID</th>
                                <th style={{ padding: '1rem' }}>Name</th>
                                <th style={{ padding: '1rem' }}>Course</th>
                                <th style={{ padding: '1rem' }}>Start Date</th>
                                <th style={{ padding: '1rem' }}>Enrollment</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {batches.map(batch => {
                                const fillPercentage = ((batch.enrolled_count || 0) / batch.strength) * 100
                                const isFull = fillPercentage >= 100

                                return (
                                    <tr
                                        key={batch.id}
                                        onClick={() => router.push(`/dashboard/sales/batch/${batch.id}`)}
                                        style={{
                                            borderBottom: '1px solid var(--border)',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '1rem', fontWeight: '600' }}>{batch.id}</td>
                                        <td style={{ padding: '1rem' }}>{batch.name}</td>
                                        <td style={{ padding: '1rem' }}>{batch.course}</td>
                                        <td style={{ padding: '1rem' }}>
                                            {new Date(batch.start_date).toLocaleDateString('en-US', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ flex: 1, height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{
                                                        width: `${fillPercentage}%`,
                                                        height: '100%',
                                                        background: isFull ? '#ef4444' : 'var(--primary)',
                                                        transition: 'width 0.3s'
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                                                    {batch.enrolled_count}/{batch.strength}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                background: isFull ? '#fee2e2' : '#dbeafe',
                                                color: isFull ? '#dc2626' : '#2563eb'
                                            }}>
                                                {isFull ? 'Full' : 'Open'}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

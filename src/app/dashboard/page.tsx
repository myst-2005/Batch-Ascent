
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Users, Calendar, BookOpen, Clock, Edit } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Batch {
    id: string
    name: string
    course: string
    strength: number
    start_date: string
    academic_lead: string
    school?: string
    mode?: 'Online' | 'Offline'
    enrolled_count?: number
}

export default function DashboardPage() {
    const router = useRouter()
    const [batches, setBatches] = useState<Batch[]>([])
    const [loading, setLoading] = useState(true)
    const [now, setNow] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        fetchBatches()
    }, [])

    const fetchBatches = async () => {
        try {
            let query = supabase.from('batches').select('*')

            // Filter by school if user is not Admin (and has a school set)
            const userSchool = localStorage.getItem('userSchool')
            const userRole = localStorage.getItem('userRole')
            const userName = localStorage.getItem('userName')

            if (userRole !== 'ADMIN') {
                if (userSchool) {
                    query = query.eq('school', userSchool)
                }

                // If SHO, only show their own batches
                if (userRole === 'SHO' && userName) {
                    query = query.eq('sho_name', userName)
                }
            }

            const { data, error } = await query

            if (error) throw error

            if (data) {
                // Fetch enrolled counts for each batch
                const batchesWithCounts = await Promise.all(data.map(async (batch) => {
                    const { count } = await supabase
                        .from('student_batches')
                        .select('*', { count: 'exact', head: true })
                        .eq('batch_id', batch.id)

                    return { ...batch, enrolled_count: count || 0 }
                }))
                setBatches(batchesWithCounts)
            }
        } catch (error: any) {
            console.error('Error fetching batches:', error.message || error)
        } finally {
            setLoading(false)
        }
    }

    const getCountdown = (startDate: string) => {
        const start = new Date(startDate).getTime()
        const current = now.getTime()
        const diff = start - current

        if (diff <= 0) return { expired: true, text: 'Started' }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)

        return { expired: false, text: `${days}d ${hours}h ${minutes}m ${seconds}s` }
    }

    if (loading) return <div className="animate-pulse">Loading batches...</div>

    return (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {batches.map((batch) => (
                <div
                    key={batch.id}
                    className="card"
                    onClick={() => router.push(`/dashboard/batch/${batch.id}`)}
                    style={{ transition: 'all 0.2s', cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)'
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = ''
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>{batch.name}</h3>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'var(--surface-hover)', borderRadius: '0.25rem', color: 'var(--text-secondary)' }}>{batch.id}</span>
                                {batch.mode && (
                                    <span style={{
                                        fontSize: '0.75rem',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '0.25rem',
                                        background: batch.mode === 'Online' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                        color: batch.mode === 'Online' ? 'var(--success)' : 'var(--primary)',
                                        border: `1px solid ${batch.mode === 'Online' ? 'var(--success)' : 'var(--primary)'}`
                                    }}>
                                        {batch.mode}
                                    </span>
                                )}
                            </div>
                        </div>
                        {typeof window !== 'undefined' && localStorage.getItem('userRole') === 'ACADEMIC_LEAD' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(`/dashboard/batch/${batch.id}/edit`)
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    padding: '0.25rem',
                                    borderRadius: '0.25rem',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                title="Edit Batch"
                            >
                                <Edit size={18} />
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                            <BookOpen size={16} />
                            <span>{batch.course}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                            <div style={{ position: 'relative', width: '24px', height: '24px' }}>
                                <svg width="24" height="24" viewBox="0 0 36 36">
                                    <path
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="#e2e8f0"
                                        strokeWidth="4"
                                    />
                                    <path
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="var(--primary)"
                                        strokeWidth="4"
                                        strokeDasharray={`${((batch.enrolled_count || 0) / (batch.strength || 1)) * 100}, 100`}
                                    />
                                </svg>
                            </div>
                            <span>{batch.enrolled_count || 0} / {batch.strength} Students</span>
                        </div>
                        {batch.school && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                <BookOpen size={16} />
                                <span>{batch.school}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                            <Calendar size={16} />
                            <span>{new Date(batch.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                    </div>

                    {/* Countdown Timer */}
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1rem',
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                        borderRadius: '0.75rem',
                        color: 'white',
                        textAlign: 'center',
                        boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                    }}>
                        <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <Clock size={14} />
                            Orientation In
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', fontFamily: 'monospace' }}>
                            {getCountdown(batch.start_date).text}
                        </div>
                    </div>


                </div>
            ))}
        </div>
    )
}

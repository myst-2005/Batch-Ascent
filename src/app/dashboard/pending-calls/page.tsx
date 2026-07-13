'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Phone, RefreshCw } from 'lucide-react'

interface PendingCall {
    id: string
    student_name: string
    student_phone?: string
    batch_id: string
    batch_name: string
}

export default function PendingCallsPage() {
    const [list, setList] = useState<PendingCall[]>([])
    const [loading, setLoading] = useState(true)
    const [role, setRole] = useState<string | null>(null)

    useEffect(() => {
        setRole(localStorage.getItem('userRole'))
        fetchPending()
    }, [])

    const fetchPending = async () => {
        try {
            setLoading(true)

            const userRole = localStorage.getItem('userRole')
            const userSchool = localStorage.getItem('userSchool')
            const userName = localStorage.getItem('userName')
            const salesId = localStorage.getItem('salesId')

            // 1. Scope the visible batches by role / school (same rules as the dashboard).
            let batchQuery = supabase.from('batches').select('id, name, school, sho_name')
            const isSuperUser = userRole === 'ADMIN' || userRole === 'CEO'
            if (!isSuperUser) {
                if (userSchool) batchQuery = batchQuery.eq('school', userSchool)
                if ((userRole === 'SHO' || userRole === 'SSHO') && userName) {
                    batchQuery = batchQuery.eq('sho_name', userName)
                }
            }

            const { data: batchesData, error: batchError } = await batchQuery
            if (batchError) throw batchError

            const batchIds = (batchesData || []).map(b => b.id)
            const batchName: Record<string, string> = {}
            ;(batchesData || []).forEach(b => { batchName[b.id] = b.name })

            if (batchIds.length === 0) {
                setList([])
                return
            }

            // 2. Fetch enrollments for those batches (SALES sees only their own leads).
            let enrollQuery = supabase
                .from('sales_enrollments')
                .select('id, student_name, student_phone, batch_id, sales_id, verified_at, status, called_at')
                .in('batch_id', batchIds)

            if (userRole === 'SALES' && salesId) {
                enrollQuery = enrollQuery.eq('sales_id', salesId)
            }

            const { data: enrollments, error: enrollError } = await enrollQuery
            if (enrollError) throw enrollError

            // 3. Pending call = verified but not yet called.
            const pending = (enrollments || [])
                .filter(e => (e.verified_at || e.status === 'Verified') && !e.called_at)
                .map(e => ({
                    id: e.id,
                    student_name: e.student_name,
                    student_phone: e.student_phone,
                    batch_id: e.batch_id,
                    batch_name: batchName[e.batch_id] || 'Unknown Batch',
                }))
                .sort((a, b) => a.batch_name.localeCompare(b.batch_name))

            setList(pending)
        } catch (err: any) {
            console.error('Error fetching pending calls:', err.message || err)
        } finally {
            setLoading(false)
        }
    }

    // SALES uses its own batch route; everyone else uses the standard batch page.
    const batchHref = (batchId: string) =>
        role === 'SALES' ? `/dashboard/sales/batch/${batchId}` : `/dashboard/batch/${batchId}`

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                    <Phone size={22} />
                    Pending Calls
                    <span style={{
                        background: '#3b82f6', color: 'white',
                        padding: '0.125rem 0.6rem', borderRadius: '999px',
                        fontSize: '0.85rem', fontWeight: 600,
                    }}>
                        {list.length}
                    </span>
                </h2>
                <button
                    onClick={fetchPending}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    disabled={loading}
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Verified students who are waiting for a welcome call.
            </p>

            {loading ? (
                <div className="animate-pulse">Loading pending calls...</div>
            ) : list.length > 0 ? (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {list.map((student, index) => (
                        <a
                            key={student.id}
                            href={batchHref(student.batch_id)}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '1rem 1.5rem',
                                borderBottom: index !== list.length - 1 ? '1px solid var(--border)' : 'none',
                                transition: 'background 0.2s',
                                background: 'var(--surface)',
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface)'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        background: '#bfdbfe', color: '#1d4ed8',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 'bold', flexShrink: 0,
                                    }}>
                                        {student.student_name?.[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)' }}>{student.student_name}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            Batch: {student.batch_name}
                                            {student.student_phone ? ` · ${student.student_phone}` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        fontSize: '0.85rem', color: '#2563eb', fontWeight: 600,
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    }}>
                                        Call Student
                                        <Phone size={16} />
                                    </div>
                                    <div style={{ color: 'var(--text-tertiary)' }}>→</div>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            ) : (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📞</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>All Calls Done!</div>
                    <div>No verified students waiting for a call.</div>
                </div>
            )}
        </div>
    )
}

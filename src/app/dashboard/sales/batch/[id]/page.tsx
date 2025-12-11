'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, Users, Mail, Phone, Trash2 } from 'lucide-react'
import { use } from 'react'

interface Student {
    id: string
    student_email: string
    student_name: string
    student_phone: string
    linked_at: string
    sales_id?: string
}

interface Batch {
    id: string
    name: string
    course: string
    strength: number
    start_date: string
    school: string
}

export default function SalesBatchDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [batch, setBatch] = useState<Batch | null>(null)
    const [students, setStudents] = useState<Student[]>([])
    const [loading, setLoading] = useState(true)
    const [salesId, setSalesId] = useState<string | null>(null)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setSalesId(localStorage.getItem('salesId'))
        }
        fetchBatchDetails()
        fetchStudents()
    }, [id])

    const fetchBatchDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('batches')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            setBatch(data)
        } catch (error) {
            console.error('Error fetching batch:', error)
        }
    }

    const handleDeleteStudent = async (studentId: string) => {
        if (!confirm('Are you sure you want to remove this student? This action cannot be undone.')) return

        try {
            const { error } = await supabase
                .from('student_batches')
                .delete()
                .eq('id', studentId)

            if (error) throw error

            // Refresh list
            fetchStudents()
        } catch (error: any) {
            alert('Error deleting student: ' + error.message)
        }
    }

    const fetchStudents = async () => {
        try {
            const { data, error } = await supabase
                .from('student_batches')
                .select('*')
                .eq('batch_id', id)
                .order('linked_at', { ascending: false })

            if (error) throw error
            setStudents(data || [])
        } catch (error) {
            console.error('Error fetching students:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div>Loading...</div>

    if (!batch) return <div>Batch not found</div>

    // Filter students enrolled by this sales person
    const myStudents = students.filter(s => s.sales_id === salesId)
    const otherStudents = students.filter(s => s.sales_id !== salesId)

    return (
        <div className="animate-fade-in">
            <button
                onClick={() => router.back()}
                className="btn"
                style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
                <ArrowLeft size={18} />
                Back to Dashboard
            </button>

            {/* Batch Info Card */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>{batch.name}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Course</p>
                        <p style={{ fontWeight: '600' }}>{batch.course}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Start Date</p>
                        <p style={{ fontWeight: '600' }}>
                            {new Date(batch.start_date).toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })}
                        </p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Capacity</p>
                        <p style={{ fontWeight: '600' }}>{students.length} / {batch.strength}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Your Enrollments</p>
                        <p style={{ fontWeight: '600', color: 'var(--primary)' }}>{myStudents.length}</p>
                    </div>
                </div>
            </div>

            {/* My Students */}
            {myStudents.length > 0 && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--primary)' }}>
                        Students You Enrolled ({myStudents.length})
                    </h3>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {myStudents.map(student => (
                            <div
                                key={student.id}
                                style={{
                                    padding: '1rem',
                                    background: 'var(--surface)',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--border)',
                                    display: 'grid',
                                    gridTemplateColumns: '1fr auto',
                                    gap: '1rem',
                                    alignItems: 'center'
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <h4 style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--primary)' }}>
                                        {student.student_name || 'N/A'}
                                    </h4>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        {student.student_email}
                                    </div>
                                    {student.student_phone && (
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                            {student.student_phone}
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                                        Enrolled: {new Date(student.linked_at).toLocaleDateString()}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDeleteStudent(student.id)}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: 'none',
                                        color: 'var(--error)',
                                        cursor: 'pointer',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.375rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                    title="Remove student"
                                >
                                    <Trash2 size={16} />
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Other Students */}
            {otherStudents.length > 0 && (
                <div className="card">
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                        Other Students ({otherStudents.length})
                    </h3>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {otherStudents.map(student => (
                            <div
                                key={student.id}
                                style={{
                                    padding: '1rem',
                                    background: 'var(--surface-hover)',
                                    borderRadius: '0.5rem'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <div>
                                        <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{student.student_name || 'N/A'}</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Mail size={14} />
                                                {student.student_email}
                                            </div>
                                            {student.sales_id && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>
                                                    Enrolled by: {student.sales_id}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-secondary)',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {new Date(student.linked_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {students.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <Users size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-secondary)' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>No students enrolled yet</p>
                </div>
            )}
        </div>
    )
}

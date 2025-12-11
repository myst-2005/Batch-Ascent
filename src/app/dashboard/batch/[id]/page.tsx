'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, Users, Mail, Phone, Calendar } from 'lucide-react'
import { use } from 'react'

interface Student {
    id: string
    student_email: string
    student_name: string
    student_phone: string
    linked_at: string
    sales_id?: string
    sales_person?: {
        name: string
        phone: string
    }
    onboarding_completed?: boolean
    official_student_id?: string
}

interface Batch {
    id: string
    name: string
    course: string
    strength: number
    start_date: string
    school: string
    academic_lead: string
    sho_name: string
    mode: string
    cliq_id?: string
}

export default function BatchDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [batch, setBatch] = useState<Batch | null>(null)
    const [students, setStudents] = useState<Student[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
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

    const fetchStudents = async () => {
        try {
            // 1. Fetch enrollments
            const { data: enrollments, error: enrollError } = await supabase
                .from('student_batches')
                .select(`
                    *,
                    sales_person:users!student_batches_sales_id_fkey(name, phone)
                `)
                .eq('batch_id', id)
                .order('linked_at', { ascending: false })

            if (enrollError) throw enrollError

            // 2. Fetch official students to check onboarding status
            const { data: officialStudents, error: officialError } = await supabase
                .from('students')
                .select('email, student_id')
                .eq('batch_id', id)

            if (officialError) throw officialError

            // 3. Merge data
            const officialMap = new Map(officialStudents?.map(s => [s.email, s.student_id]) || [])

            const mergedStudents = (enrollments || []).map(s => ({
                ...s,
                onboarding_completed: officialMap.has(s.student_email),
                official_student_id: officialMap.get(s.student_email)
            }))

            setStudents(mergedStudents)
        } catch (error) {
            console.error('Error fetching students:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleOnboarding = async (student: Student, currentStatus: boolean) => {
        try {
            if (!currentStatus) {
                // Mark as Onboarded -> Insert into students table
                // Clean phone number for bigint (remove non-digits)
                const phoneInt = student.student_phone
                    ? parseInt(student.student_phone.replace(/\D/g, ''))
                    : null

                const { error } = await supabase
                    .from('students')
                    .insert([{
                        full_name: student.student_name,
                        email: student.student_email,
                        phone: phoneInt,
                        batch_id: id
                    }])

                if (error) throw error
            } else {
                // Mark as Pending -> Remove from students table
                const { error } = await supabase
                    .from('students')
                    .delete()
                    .eq('email', student.student_email)
                    .eq('batch_id', id)

                if (error) throw error
            }

            // Refresh list
            fetchStudents()
        } catch (error: any) {
            console.error('Error updating status:', error)
            alert('Failed to update status: ' + error.message)
        }
    }

    if (loading) return <div>Loading...</div>

    if (!batch) return <div>Batch not found</div>

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
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>{batch.name}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Batch ID</p>
                        <p style={{ fontWeight: '600' }}>{batch.id}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Cliq ID</p>
                        <p style={{ fontWeight: '600', fontFamily: 'monospace', color: 'var(--primary)' }}>{batch.cliq_id || 'N/A'}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Course</p>
                        <p style={{ fontWeight: '600' }}>{batch.course}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Start Date</p>
                        <p style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={16} />
                            {new Date(batch.start_date).toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })}
                        </p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Mode</p>
                        <p style={{ fontWeight: '600' }}>{batch.mode}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Enrollment</p>
                        <p style={{ fontWeight: '600', color: 'var(--primary)' }}>{students.length} / {batch.strength}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Academic Lead</p>
                        <p style={{ fontWeight: '600' }}>{batch.academic_lead}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>SHO</p>
                        <p style={{ fontWeight: '600' }}>{batch.sho_name}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>School</p>
                        <p style={{ fontWeight: '600' }}>{batch.school}</p>
                    </div>
                </div>
            </div>

            {/* Students List */}
            <div className="card">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={20} />
                    Enrolled Students ({students.length})
                </h3>

                {students.length > 0 ? (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {students.map(student => (
                            <div
                                key={student.id}
                                style={{
                                    padding: '1.5rem',
                                    background: 'var(--surface-hover)',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--border)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: '0.75rem' }}>
                                            {student.student_name || 'N/A'}
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                                <Mail size={14} />
                                                <span>{student.student_email}</span>
                                            </div>
                                            {student.student_phone && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                                    <Phone size={14} />
                                                    <span>{student.student_phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                            Enrolled on
                                        </p>
                                        <p style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                                            {new Date(student.linked_at).toLocaleDateString('en-US', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </p>
                                        {student.sales_person && (
                                            <div style={{
                                                marginTop: '0.5rem',
                                                padding: '0.5rem',
                                                background: 'rgba(37, 99, 235, 0.1)',
                                                borderRadius: '0.375rem',
                                                border: '1px solid var(--primary)'
                                            }}>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                                    Enrolled by
                                                </p>
                                                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--primary)' }}>
                                                    {student.sales_person.name}
                                                </p>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                                                    <Phone size={12} />
                                                    {student.sales_person.phone}
                                                </p>
                                            </div>
                                        )}

                                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                            <div style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                background: student.onboarding_completed ? '#dcfce7' : '#fef9c3',
                                                color: student.onboarding_completed ? '#166534' : '#854d0e',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                                                {student.onboarding_completed ? 'Onboarded' : 'Pending Onboarding'}
                                            </div>

                                            {student.official_student_id && (
                                                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--primary)' }}>
                                                    ID: {student.official_student_id}
                                                </div>
                                            )}

                                            <button
                                                onClick={() => toggleOnboarding(student, !!student.onboarding_completed)}
                                                style={{
                                                    fontSize: '0.75rem',
                                                    textDecoration: 'underline',
                                                    color: 'var(--primary)',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Mark as {student.onboarding_completed ? 'Pending' : 'Done'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                        <p>No students enrolled yet</p>
                    </div>
                )}
            </div>
        </div>
    )
}

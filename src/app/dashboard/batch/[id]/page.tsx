'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, Users, Mail, Phone, Calendar, RefreshCw, CheckCircle } from 'lucide-react'
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
    verified_at?: string
    status?: string
    called_at?: string
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

    const handleRefreshCliqId = async () => {
        if (!batch?.sho_name) return

        try {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('cliq_id')
                .eq('name', batch.sho_name)
                .eq('role', 'SHO')
                .maybeSingle()

            if (userError) throw userError

            if (userData?.cliq_id) {
                const { error: batchError } = await supabase
                    .from('batches')
                    .update({ cliq_id: userData.cliq_id })
                    .eq('id', batch.id)

                if (batchError) throw batchError

                setBatch(prev => prev ? { ...prev, cliq_id: userData.cliq_id } : null)
                alert(`Cliq ID synced: ${userData.cliq_id}`)
            } else {
                alert(`No Cliq ID found for SHO: ${batch.sho_name}`)
            }
        } catch (error: any) {
            console.error('Error refreshing Cliq ID:', error)
            alert('Error: ' + error.message)
        }
    }

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
            // 1. Fetch enrollments WITHOUT JOIN constraints
            const { data: enrollments, error: enrollError } = await supabase
                .from('student_batches')
                .select('*')
                .eq('batch_id', id)
                .order('linked_at', { ascending: false })

            if (enrollError) throw enrollError

            // Fetch Sales Persons for displayed IDs manual join
            const salesIds: string[] = enrollments?.map((e: any) => e.sales_id).filter(Boolean) || []
            let salesMap = new Map()

            if (salesIds.length > 0) {
                const { data: salesUsers } = await supabase
                    .from('users')
                    .select('id, name, phone, sales_id')
                    .or(`sales_id.in.(${salesIds.join(',')}),id.in.(${salesIds.join(',')})`)

                salesUsers?.forEach((u: any) => {
                    if (u.sales_id) salesMap.set(u.sales_id, u)
                    if (u.id) salesMap.set(u.id, u)
                })
            }

            const enrollmentsWithSales = enrollments?.map((e: any) => ({
                ...e,
                sales_person: salesMap.get(e.sales_id)
            }))

            // 2. Fetch official students to check onboarding status
            const { data: officialStudents, error: officialError } = await supabase
                .from('students')
                .select('email, student_id')
                .eq('batch_id', id)

            if (officialError) throw officialError

            // 3. Merge data
            const officialMap = new Map(officialStudents?.map((s: any) => [s.email, s.student_id]) || [])

            const mergedStudents = (enrollmentsWithSales || []).map((s: any) => ({
                ...s,
                onboarding_completed: officialMap.has(s.student_email) || s.onboarding_completed,
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
                // Mark as Onboarded 
                // 1. Insert into students table (Master list)
                const phoneInt = student.student_phone
                    ? parseInt(student.student_phone.replace(/\D/g, ''))
                    : null

                const { error: insertError } = await supabase
                    .from('students')
                    .insert([{
                        full_name: student.student_name,
                        email: student.student_email,
                        phone: phoneInt,
                        batch_id: id
                    }])

                if (insertError) throw insertError

                // 2. Update flag in student_batches
                const { error: updateError } = await supabase
                    .from('student_batches')
                    .update({ onboarding_completed: true })
                    .eq('id', student.id)

                if (updateError) throw updateError

            } else {
                // Mark as Pending
                // 1. Remove from students table
                const { error: deleteError } = await supabase
                    .from('students')
                    .delete()
                    .eq('email', student.student_email)
                    .eq('batch_id', id)

                if (deleteError) throw deleteError

                // 2. Update flag in student_batches
                const { error: updateError } = await supabase
                    .from('student_batches')
                    .update({ onboarding_completed: false })
                    .eq('id', student.id)

                if (updateError) throw updateError
            }

            // Refresh list
            fetchStudents()
        } catch (error: any) {
            console.error('Error updating status:', error)
            alert('Failed to update status: ' + error.message)
        }
    }

    const handleCallStudent = async (studentId: string) => {
        try {
            const now = new Date().toISOString()
            const { error } = await supabase
                .from('student_batches')
                .update({ called_at: now })
                .eq('id', studentId)

            if (error) throw error

            setStudents(prev => prev.map(s => s.id === studentId ? { ...s, called_at: now } : s))
        } catch (error: any) {
            console.error('Error updating call status:', error)
            alert('Error updating call status: ' + error.message)
        }
    }

    const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
    const [tempEmail, setTempEmail] = useState('')

    const startEditingEmail = (student: Student) => {
        setEditingStudentId(student.id)
        setTempEmail(student.student_email)
    }

    const cancelEditingEmail = () => {
        setEditingStudentId(null)
        setTempEmail('')
    }

    const saveEmail = async (student: Student) => {
        if (!tempEmail || !tempEmail.includes('@')) {
            alert('Please enter a valid email')
            return
        }
        if (tempEmail === student.student_email) {
            cancelEditingEmail()
            return
        }

        try {
            // 1. Update student_batches (Source of Truth for enrollment)
            const { error: batchError } = await supabase
                .from('student_batches')
                .update({ student_email: tempEmail })
                .eq('id', student.id)

            if (batchError) throw batchError

            // 2. If onboarded, update students table (Official Record)
            if (student.onboarding_completed) {
                const { error: studentError } = await supabase
                    .from('students')
                    .update({ email: tempEmail })
                    .eq('email', student.student_email)
                    .eq('batch_id', id)

                if (studentError) throw studentError
            }

            // Update local state
            setStudents(prev => prev.map(s => s.id === student.id ? { ...s, student_email: tempEmail } : s))
            setEditingStudentId(null)
            setTempEmail('')
            alert('Email updated successfully')

        } catch (error: any) {
            console.error('Error updating email:', error)
            alert('Failed to update email: ' + error.message)
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <p style={{ fontWeight: '600', fontFamily: 'monospace', color: 'var(--primary)' }}>{batch.cliq_id || 'N/A'}</p>
                            {!batch.cliq_id && (
                                <button
                                    onClick={handleRefreshCliqId}
                                    title="Sync from SHO Profile"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--primary)',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <RefreshCw size={14} />
                                </button>
                            )}
                        </div>
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
                                    background: 'var(--surface)',
                                    borderRadius: '0.75rem',
                                    border: '1px solid var(--border)',
                                    borderLeft: `5px solid ${!(student.verified_at || student.status === 'Verified') ? '#f97316' /* Orange */
                                        : student.onboarding_completed ? '#22c55e' /* Green */
                                            : '#eab308' /* Yellow */
                                        }`,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    gap: '1rem',
                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                            >
                                {/* 1. Avatar */}
                                <div style={{
                                    flexShrink: 0, width: '3rem', height: '3rem', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, var(--primary), #60a5fa)',
                                    color: 'white', fontWeight: 'bold', fontSize: '1.2rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 6px -1px rgba(var(--primary-rgb), 0.3)'
                                }}>
                                    {student.student_name?.[0]?.toUpperCase() || '?'}
                                </div>

                                {/* 2. Identity */}
                                <div style={{ flex: '1' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--foreground)', lineHeight: '1.2' }}>
                                        {student.student_name || 'N/A'}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.125rem', marginTop: '0.25rem' }}>

                                        {/* EMAIL FIELD WITH EDIT */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', minHeight: '1.5rem' }}>
                                            <Mail size={12} strokeWidth={2} />
                                            {editingStudentId === student.id ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input
                                                        type="email"
                                                        value={tempEmail}
                                                        onChange={(e) => setTempEmail(e.target.value)}
                                                        style={{
                                                            fontSize: '0.85rem', padding: '0.1rem 0.25rem',
                                                            border: '1px solid var(--primary)', borderRadius: '0.25rem',
                                                            width: '200px'
                                                        }}
                                                        autoFocus
                                                    />
                                                    <button onClick={() => saveEmail(student)} style={{ color: 'var(--green-600)', background: 'none', border: 'none', cursor: 'pointer' }} title="Save">
                                                        <CheckCircle size={14} />
                                                    </button>
                                                    <button onClick={cancelEditingEmail} style={{ color: 'var(--red-600)', background: 'none', border: 'none', cursor: 'pointer' }} title="Cancel">
                                                        <CheckCircle size={14} style={{ transform: 'rotate(45deg)' }} /> {/* Using CheckCircle as X for now, or fetch X from imports */}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {student.student_email}
                                                    <button
                                                        onClick={() => startEditingEmail(student)}
                                                        style={{
                                                            opacity: 0,
                                                            transition: 'opacity 0.2s',
                                                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)'
                                                        }}
                                                        className="group-hover:opacity-100"
                                                        title="Edit Email"
                                                    >
                                                        <RefreshCw size={12} style={{ transform: 'rotate(90deg)' }} /> {/* Using Refresh as edit placeholder if needed or Pencil */}
                                                    </button>
                                                </span>
                                            )}
                                        </div>

                                        {student.student_phone && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                                <Phone size={12} strokeWidth={2} /> {student.student_phone}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* 3. Meta (Middle) */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', paddingRight: '1rem' }}>
                                    {student.official_student_id && (
                                        <span style={{
                                            fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: '700',
                                            background: '#eff6ff', color: '#3b82f6',
                                            padding: '0.125rem 0.6rem', borderRadius: '0.375rem',
                                            border: '1px solid #dbeafe'
                                        }}>
                                            {student.official_student_id}
                                        </span>
                                    )}
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                        Enrolled {new Date(student.linked_at).toLocaleDateString('en-GB')}
                                    </div>
                                    {student.sales_person && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            By <span style={{ fontWeight: '600' }}>{student.sales_person.name}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Vertical Divider */}
                                <div style={{ width: '1px', alignSelf: 'stretch', background: 'var(--border)', margin: '0.5rem 0' }} />

                                {/* 4. Status & Actions (Right) - UPDATED WORKFLOW */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', minWidth: '140px' }}>

                                    {/* Verification Check */}
                                    {!(student.verified_at || student.status === 'Verified') ? (
                                        <div style={{
                                            padding: '0.25rem 0.75rem', borderRadius: '9999px',
                                            fontSize: '0.75rem', fontWeight: '600',
                                            background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa',
                                            display: 'flex', alignItems: 'center', gap: '0.375rem'
                                        }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f97316' }} />
                                            Pending Verification
                                        </div>
                                    ) : (
                                        <>
                                            {/* Workflow: Verified -> To Call -> Pending Onboard -> Onboarded */}

                                            {/* 1. NOT CALLED YET */}
                                            {!student.called_at ? (
                                                <>
                                                    <div style={{
                                                        padding: '0.25rem 0.75rem', borderRadius: '9999px',
                                                        fontSize: '0.75rem', fontWeight: '600',
                                                        background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                                                        display: 'flex', alignItems: 'center', gap: '0.375rem'
                                                    }}>
                                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }} />
                                                        To Call
                                                    </div>

                                                    <button
                                                        onClick={() => handleCallStudent(student.id)}
                                                        className="hover:scale-105 active:scale-95"
                                                        style={{
                                                            fontSize: '0.75rem', fontWeight: '600',
                                                            color: 'white', background: 'var(--primary)',
                                                            border: 'none', padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
                                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem',
                                                            boxShadow: '0 2px 4px rgba(var(--primary-rgb), 0.2)',
                                                            transition: 'transform 0.1s'
                                                        }}
                                                    >
                                                        <Phone size={12} /> Call Student
                                                    </button>
                                                </>
                                            ) : (
                                                /* 2. CALLED, EITHER PENDING OR ONBOARDED */
                                                <>
                                                    {/* Badge */}
                                                    <div style={{
                                                        padding: '0.25rem 0.75rem', borderRadius: '9999px',
                                                        fontSize: '0.75rem', fontWeight: '600',
                                                        background: student.onboarding_completed ? '#dcfce7' : '#fef9c3',
                                                        color: student.onboarding_completed ? '#166534' : '#854d0e',
                                                        border: `1px solid ${student.onboarding_completed ? '#bbf7d0' : '#fde047'}`,
                                                        display: 'flex', alignItems: 'center', gap: '0.375rem'
                                                    }}>
                                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: student.onboarding_completed ? '#22c55e' : '#eab308' }} />
                                                        {student.onboarding_completed ? 'Onboarded' : 'Pending Onboard'}
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                                        {/* Called Date */}
                                                        <div style={{
                                                            fontSize: '0.7rem', color: 'var(--text-secondary)',
                                                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                                                            background: 'var(--surface-active)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem'
                                                        }}>
                                                            <Phone size={12} />
                                                            Called {new Date(student.called_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                        </div>

                                                        {/* Action: Mark Done or Undo */}
                                                        <button
                                                            onClick={() => toggleOnboarding(student, !!student.onboarding_completed)}
                                                            style={{
                                                                fontSize: '0.75rem', fontWeight: '500',
                                                                color: 'var(--text-tertiary)', textDecoration: 'underline',
                                                                background: 'none', border: 'none', cursor: 'pointer',
                                                                marginTop: '0.25rem'
                                                            }}
                                                        >
                                                            {student.onboarding_completed ? 'Undo' : 'Mark Onboarded'}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
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

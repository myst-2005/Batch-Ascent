'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Link as LinkIcon, CheckCircle, UserPlus, Users, Building, Phone, Mail, User, Filter } from 'lucide-react'
import { SCHOOLS } from '@/lib/constants'

interface Batch {
    id: string
    name: string
    school: string
}

interface SalesPerson {
    id: string
    name: string
    sales_id: string
    school: string
}

export default function LinkStudentPage() {
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [generatedId, setGeneratedId] = useState<string | null>(null)

    const [batches, setBatches] = useState<Batch[]>([])
    const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([])
    const [selectedSchool, setSelectedSchool] = useState('')

    const [formData, setFormData] = useState({
        student_name: '',
        student_email: '',
        student_phone: '',
        batch_id: '',
        sales_user_id: ''
    })

    useEffect(() => {
        fetchMetadata()
    }, [])

    const fetchMetadata = async () => {
        try {
            // Fetch Batches
            const { data: batchData } = await supabase
                .from('batches')
                .select('id, name, school')
                .order('start_date', { ascending: false })

            if (batchData) setBatches(batchData)

            // Fetch Sales Persons
            const { data: salesData } = await supabase
                .from('users')
                .select('id, name, sales_id, school')
                .or('role.eq.SALES,role.eq.SALES_EXECUTIVE,role.eq.SALES_TEAM_LEAD')
                .order('name')

            if (salesData) setSalesPersons(salesData)
        } catch (error) {
            console.error('Error fetching metadata:', error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setSuccess(false)
        setGeneratedId(null)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Not authenticated')

            const response = await fetch('/api/link-student', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(formData)
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to link student')
            }

            setSuccess(true)

            // Set generated ID from response
            const sData = result.student
            if (sData?.student_id || sData?.official_student_id) {
                setGeneratedId(sData.student_id || sData.official_student_id)
            } else if (sData?.id) {
                setGeneratedId('ID Generated')
            } else {
                setGeneratedId('ID Pending / Existing')
            }

            setFormData({
                student_name: '',
                student_email: '',
                student_phone: '',
                batch_id: '',
                sales_user_id: ''
            })
            // Reset school is optional, maybe keep it for faster entry of next student

        } catch (error: any) {
            console.error('Error linking student:', error)
            alert('Error: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
            <div className="card">
                <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <UserPlus className="text-primary" />
                        Manual Student Linking
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        Manually add an onboarded student, link them to a sales counselor, and generate their ID.
                    </p>
                </div>

                {success && (
                    <div className="animate-scale-in" style={{
                        padding: '1.5rem',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '0.75rem',
                        marginBottom: '2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                        textAlign: 'center'
                    }}>
                        <CheckCircle size={48} className="text-green-500" style={{ marginBottom: '0.5rem' }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#15803d' }}>Student Linked Successfully!</h3>
                        <p style={{ color: '#166534' }}>
                            The student has been verified, onboarded, and assigned to the sales counselor.
                        </p>
                        {generatedId && generatedId !== 'ID Generated' && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.75rem 1.5rem',
                                background: 'white',
                                borderRadius: '0.5rem',
                                border: '2px dashed #86efac',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}>
                                <span style={{ fontSize: '0.875rem', color: '#65a30d', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Generated Student ID</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: '800', fontFamily: 'monospace', color: '#15803d' }}>{generatedId || 'Pending Generation'}</span>
                            </div>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>

                    {/* Filter Section */}
                    <div style={{ background: 'var(--surface-active)', padding: '1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Filter size={20} className="text-secondary" />
                        <div style={{ flex: 1 }}>
                            <label className="label" style={{ marginBottom: '0.25rem' }}>Filter by School (Optional)</label>
                            <select
                                className="input"
                                value={selectedSchool}
                                onChange={(e) => {
                                    setSelectedSchool(e.target.value)
                                    // Reset batch selection if it doesn't belong to new school
                                    setFormData(prev => ({ ...prev, batch_id: '' }))
                                }}
                            >
                                <option value="">All Schools</option>
                                {SCHOOLS.map(school => (
                                    <option key={school} value={school}>{school}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {/* Student Details Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <User size={16} /> Student Details
                            </h3>

                            <div>
                                <label className="label">Full Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g. John Doe"
                                    value={formData.student_name}
                                    onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <input
                                        type="email"
                                        className="input"
                                        style={{ paddingLeft: '2.5rem' }}
                                        placeholder="student@example.com"
                                        value={formData.student_email}
                                        onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Phone Number</label>
                                <div style={{ position: 'relative' }}>
                                    <Phone size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <input
                                        type="tel"
                                        className="input"
                                        style={{ paddingLeft: '2.5rem' }}
                                        placeholder="+91 98765 43210"
                                        value={formData.student_phone}
                                        onChange={(e) => setFormData({ ...formData, student_phone: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Assignment Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Building size={16} /> Assignment
                            </h3>

                            <div>
                                <label className="label">Assign Batch</label>
                                <select
                                    className="input"
                                    value={formData.batch_id}
                                    onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select a batch...</option>
                                    {batches
                                        .filter(b => !selectedSchool || b.school === selectedSchool)
                                        .map(batch => (
                                            <option key={batch.id} value={batch.id}>
                                                {batch.id} - {batch.name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">Sales Executive</label>
                                <div style={{ position: 'relative' }}>
                                    <Users size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <select
                                        className="input"
                                        style={{ paddingLeft: '2.5rem' }}
                                        value={formData.sales_user_id}
                                        onChange={(e) => setFormData({ ...formData, sales_user_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Select counselor...</option>
                                        {salesPersons
                                            .filter(sp => !selectedSchool || sp.school === selectedSchool || !sp.school)
                                            .map(person => (
                                                <option key={person.id} value={person.id}>
                                                    {person.name} ({person.sales_id || 'No ID'})
                                                </option>
                                            ))}
                                    </select>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                                    This counselor will be credited with the sale.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
                        >
                            <LinkIcon size={20} style={{ marginRight: '0.5rem' }} />
                            {loading ? 'Linking & Generating ID...' : 'Link Student & Generate ID'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

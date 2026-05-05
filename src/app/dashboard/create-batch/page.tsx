
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { logActivity } from '@/lib/logActivity'
import { Save } from 'lucide-react'
import { SCHOOLS } from '@/lib/constants'

export default function CreateBatchPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [userSchool, setUserSchool] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        course: '',
        start_date: '',
        sho_name: '',
        academic_lead: '',
        strength: '',
        school: '',
        mode: 'Offline'
    })
    const [academicLeads, setAcademicLeads] = useState<any[]>([])
    const [availableSHOs, setAvailableSHOs] = useState<any[]>([])
    const [schoolsList, setSchoolsList] = useState<any[]>([])

    // Fetch Schools on component mount
    useEffect(() => {
        const fetchSchools = async () => {
            try {
                const { data, error } = await supabase.from('schools').select('*').order('name')
                if (data && data.length > 0) {
                    setSchoolsList(data)
                } else {
                    // Fallback to constants if DB table is empty or missing
                    setSchoolsList(SCHOOLS.map(s => ({ name: s })))
                }
            } catch (err) {
                console.error('Error fetching schools:', JSON.stringify(err, null, 2))
                setSchoolsList(SCHOOLS.map(s => ({ name: s })))
            }
        }
        fetchSchools()
    }, [])

    const [availableCourses, setAvailableCourses] = useState<any[]>([])

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const { data, error } = await supabase
                    .from('courses')
                    .select('*')
                    .order('name')

                if (error) throw error
                if (data) setAvailableCourses(data)
            } catch (error) {
                console.error('Error fetching courses:', error)
            }
        }
        fetchCourses()
    }, [])

    useEffect(() => {
        fetchAcademicLeads()
    }, [])

    const fetchAcademicLeads = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('name, school')
                .eq('role', 'ACADEMIC_LEAD')

            if (data) setAcademicLeads(data)
        } catch (error) {
            console.error('Error fetching leads:', error)
        }
    }

    const fetchSHOs = async (school: string) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('name')
                .in('role', ['SHO', 'SSHO'])
                .eq('school', school)

            if (data) setAvailableSHOs(data)
        } catch (error) {
            console.error('Error fetching SHOs:', error)
        }
    }

    // Auto-select Academic Lead when School is set
    useEffect(() => {
        if (formData.school) {
            // Fetch SHOs when school changes (or is set initially)
            fetchSHOs(formData.school)

            // Auto-select lead
            if (academicLeads.length > 0) {
                const leadForSchool = academicLeads.find(lead => lead.school === formData.school)
                if (leadForSchool) {
                    setFormData(prev => ({ ...prev, academic_lead: leadForSchool.name }))
                } else {
                    // Clear lead if none found for this school (optional, but good for admin switching schools)
                    setFormData(prev => ({ ...prev, academic_lead: '' }))
                }
            }
        } else {
            setAvailableSHOs([])
            setFormData(prev => ({ ...prev, academic_lead: '' }))
        }
    }, [formData.school, academicLeads])

    useState(() => {
        // Load user school and name from local storage
        if (typeof window !== 'undefined') {
            const school = localStorage.getItem('userSchool')
            const name = localStorage.getItem('userName')
            const role = localStorage.getItem('userRole')

            if (school && role !== 'ADMIN' && role !== 'CEO') {
                setUserSchool(school)
                setFormData(prev => ({ ...prev, school }))
                // fetchSHOs(school) // Handled by the new useEffect
            }

            if (name) {
                if (role === 'ACADEMIC_LEAD') {
                    setFormData(prev => ({ ...prev, academic_lead: name }))
                }
            }
        }
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase
                .from('batches')
                .insert([
                    {
                        ...formData,
                        strength: parseInt(formData.strength)
                    }
                ])

            if (error) throw error

            logActivity({ action: 'BATCH_CREATED', details: { batch_id: formData.id, batch_name: formData.name, school: formData.school, course: formData.course } })
            alert('Batch created successfully!')
            router.push('/dashboard')
        } catch (error: any) {
            console.error('Error creating batch:', error)
            alert('Error creating batch: ' + (error.message || error.details || 'Unknown error'))
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        let value = e.target.value

        // Sanitize Batch ID to prevent URL issues
        if (e.target.name === 'id') {
            const sanitized = value.replace(/[^a-zA-Z0-9-_]/g, '').toUpperCase()
            if (value !== sanitized) {
                // Optional: You could show a toast here if you had one, but strict replacement works too
            }
            value = sanitized
        }

        setFormData({ ...formData, [e.target.name]: value })
    }

    return (
        <div className="card animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Create New Batch</h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Batch ID</label>
                        <input
                            name="id"
                            type="text"
                            className="input"
                            placeholder="e.g. BATCH-001"
                            required
                            onChange={handleChange}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Only letters, numbers, hyphens (-), and underscores (_) allowed.
                        </p>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Batch Name</label>
                        <input
                            name="name"
                            type="text"
                            className="input"
                            placeholder="e.g. Alpha Cohort 2024"
                            required
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Course Name</label>
                        <select
                            name="course"
                            className="input"
                            required
                            value={formData.course}
                            onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                        >
                            <option value="">Select Course</option>
                            {availableCourses
                                .filter(course => {
                                    // If no school selected, show nothing or all (better show nothing until school selected, or all)
                                    // Let's show all if no school selected, but filter by school if one is selected.
                                    if (!formData.school) return true
                                    return course.school_name === formData.school
                                })
                                .map((course) => (
                                    <option key={course.id} value={course.name}>
                                        {course.name} ({course.code})
                                    </option>
                                ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Orientation Date</label>
                        <input
                            name="start_date"
                            type="date"
                            className="input"
                            required
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Batch Strength</label>
                    <input
                        name="strength"
                        type="number"
                        className="input"
                        placeholder="e.g. 50"
                        required
                        onChange={handleChange}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>SHO Name</label>
                        <select
                            name="sho_name"
                            className="input"
                            required
                            value={formData.sho_name}
                            onChange={(e) => setFormData({ ...formData, sho_name: e.target.value })}
                        >
                            <option value="">Select SHO</option>
                            {availableSHOs.map((sho, index) => (
                                <option key={index} value={sho.name}>{sho.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Academic Lead</label>
                        <input
                            name="academic_lead"
                            className="input"
                            required
                            value={formData.academic_lead}
                            readOnly
                            style={{ background: 'var(--surface-hover)', cursor: 'not-allowed' }}
                        />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            {typeof window !== 'undefined' && localStorage.getItem('userRole') === 'ACADEMIC_LEAD'
                                ? '* You are the Academic Lead'
                                : `* Auto-assigned for ${formData.school || 'selected school'}`
                            }
                        </div>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>School / Department</label>
                    <select
                        name="school"
                        className="input"
                        required
                        value={formData.school}
                        onChange={handleChange}
                        disabled={!!userSchool}
                        style={userSchool ? { background: 'var(--surface-hover)', cursor: 'not-allowed' } : {}}
                    >
                        <option value="">Select School</option>
                        {schoolsList.map(school => (
                            <option key={school.id || school.name} value={school.name}>{school.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Mode</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, mode: 'Offline' })}
                            className={`btn ${formData.mode === 'Offline' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1 }}
                        >
                            Offline
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, mode: 'Online' })}
                            className={`btn ${formData.mode === 'Online' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1 }}
                        >
                            Online
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        <Save size={20} style={{ marginRight: '0.5rem' }} />
                        {loading ? 'Creating...' : 'Create Batch'}
                    </button>
                </div>
            </form>
        </div>
    )
}

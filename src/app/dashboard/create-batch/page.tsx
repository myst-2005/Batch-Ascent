
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Save } from 'lucide-react'

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

    const courses = [
        {
            category: "Digital Marketing",
            items: [
                "AI Integrated Basic to Advanced Digital Marketing",
                "Performance Marketing Mastery",
                "Social Media Mastery"
            ]
        },
        {
            category: "Design",
            items: [
                "CDC",
                "Graphic Design",
                "Branding",
                "UI/UX",
                "Video Editing"
            ]
        },
        {
            category: "Tech",
            items: [
                "Python",
                "N8N",
                "Data Analytics",
                "Applied AI"
            ]
        },
        {
            category: "Finance",
            items: [
                "Advanced Practical Accounting and Financial Intelligence",
                "Advanced Taxation Course",
                "HACA Scale Up",
                "Tax Practitioner Bootcamp"
            ]
        }
    ]

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
                .eq('role', 'SHO')
                .eq('school', school)

            if (data) setAvailableSHOs(data)
        } catch (error) {
            console.error('Error fetching SHOs:', error)
        }
    }

    // Auto-select Academic Lead when School is set
    useEffect(() => {
        if (formData.school && academicLeads.length > 0) {
            const leadForSchool = academicLeads.find(lead => lead.school === formData.school)
            if (leadForSchool && formData.academic_lead !== leadForSchool.name) {
                setFormData(prev => ({ ...prev, academic_lead: leadForSchool.name }))
            }
        }
    }, [formData.school, academicLeads])

    useState(() => {
        // Load user school and name from local storage
        if (typeof window !== 'undefined') {
            const school = localStorage.getItem('userSchool')
            const name = localStorage.getItem('userName')
            const role = localStorage.getItem('userRole')

            if (school) {
                setUserSchool(school)
                setFormData(prev => ({ ...prev, school }))
                fetchSHOs(school)
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

            alert('Batch created successfully!')
            router.push('/dashboard')
        } catch (error: any) {
            console.error('Error creating batch:', error)
            alert('Error creating batch: ' + (error.message || error.details || 'Unknown error'))
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
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
                            {courses
                                .filter(category => {
                                    if (!userSchool) return true
                                    const school = userSchool.toLowerCase()
                                    const cat = category.category.toLowerCase()

                                    if (school.includes('marketing') && cat.includes('marketing')) return true
                                    if (school.includes('design') && cat.includes('design')) return true
                                    if ((school.includes('tech') || school.includes('engineering') || school.includes('software') || school.includes('it')) && cat.includes('tech')) return true
                                    if ((school.includes('finance') || school.includes('account') || school.includes('business')) && cat.includes('finance')) return true

                                    return false
                                })
                                .map((category) => (
                                    <optgroup key={category.category} label={category.category}>
                                        {category.items.map((course) => (
                                            <option key={course} value={course}>{course}</option>
                                        ))}
                                    </optgroup>
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
                    <input
                        name="school"
                        type="text"
                        className="input"
                        placeholder="e.g. School of Engineering"
                        required
                        value={formData.school}
                        onChange={handleChange}
                        readOnly={!!userSchool}
                        style={userSchool ? { background: 'var(--surface-hover)', cursor: 'not-allowed' } : {}}
                    />
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

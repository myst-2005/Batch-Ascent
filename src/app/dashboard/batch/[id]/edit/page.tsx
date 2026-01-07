'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Save, ArrowLeft, History, Trash2 } from 'lucide-react'

export default function EditBatchPage({ params }: { params: Promise<{ id: string }> }) {
    const paramsUnwrapped = use(params)
    const id = decodeURIComponent(paramsUnwrapped.id).trim()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState<any>(null)
    const [originalData, setOriginalData] = useState<any>(null)
    const [history, setHistory] = useState<any[]>([])
    const [showHistory, setShowHistory] = useState(false)
    const [userSchool, setUserSchool] = useState<string | null>(null)

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
        if (typeof window !== 'undefined') {
            setUserSchool(localStorage.getItem('userSchool'))
        }
        fetchBatchDetails()
        fetchHistory()
    }, [])

    const [availableSHOs, setAvailableSHOs] = useState<any[]>([])

    // ... (rest of imports)

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

    const fetchBatchDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('batches')
                .select('*')
                .eq('id', id)
                .maybeSingle()

            if (error) throw error
            setFormData(data)
            setOriginalData(data)
            if (data.school) {
                fetchSHOs(data.school)
            }
        } catch (error) {
            console.error('Error fetching batch:', error)
            alert('Failed to load batch details')
            router.push('/dashboard')
        } finally {
            setLoading(false)
        }
    }

    const fetchHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('batch_history')
                .select('*')
                .eq('batch_id', id)
                .order('edited_at', { ascending: false })

            if (data) setHistory(data)
        } catch (error) {
            console.error('Error fetching history:', error)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this batch? This action cannot be undone and will remove all student enrollments associated with this batch.')) {
            return
        }

        setSaving(true)
        try {
            // 1. Delete related student_batches
            const { error: studentError } = await supabase
                .from('student_batches')
                .delete()
                .eq('batch_id', id)

            if (studentError) throw studentError

            // 2. Delete related batch_history
            const { error: historyError } = await supabase
                .from('batch_history')
                .delete()
                .eq('batch_id', id)

            if (historyError) throw historyError

            // 3. Delete the batch itself
            const { error: batchError } = await supabase
                .from('batches')
                .delete()
                .eq('id', id)

            if (batchError) throw batchError

            alert('Batch deleted successfully')
            router.push('/dashboard')
        } catch (error: any) {
            console.error('Error deleting batch:', error)
            alert('Failed to delete batch: ' + error.message)
            setSaving(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        // Calculate changes
        const changes: any = {}
        Object.keys(formData).forEach(key => {
            if (formData[key] !== originalData[key]) {
                changes[key] = `${originalData[key]} -> ${formData[key]}`
            }
        })

        if (Object.keys(changes).length === 0) {
            alert('No changes detected')
            setSaving(false)
            return
        }

        try {
            // 1. Update Batch
            const { error: updateError } = await supabase
                .from('batches')
                .update(formData)
                .eq('id', id)

            if (updateError) throw updateError

            // 2. Log History
            const userName = localStorage.getItem('userName') || 'Unknown User'
            await supabase.from('batch_history').insert({
                batch_id: id,
                edited_by: userName,
                changes: changes
            })

            alert('Batch updated successfully!')
            router.push('/dashboard')
        } catch (error: any) {
            console.error('Error updating batch:', error)
            alert('Failed to update batch: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div>Loading...</div>
    if (!formData) return <div style={{ padding: '2rem', textAlign: 'center' }}>Batch not found or you do not have permission to edit it.</div>

    return (
        <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <button
                onClick={() => router.back()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
                <ArrowLeft size={20} /> Back
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Edit Batch: {originalData?.name}</h2>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <History size={18} />
                    {showHistory ? 'Hide History' : 'View History'}
                </button>
            </div>

            {showHistory && (
                <div className="card" style={{ marginBottom: '2rem', padding: '1rem', background: '#f8fafc' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>Edit History</h3>
                    {history.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>No edits recorded yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {history.map((entry) => (
                                <div key={entry.id} style={{ padding: '0.75rem', background: 'white', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: '600' }}>{entry.edited_by}</span>
                                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                            {new Date(entry.edited_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.875rem' }}>
                                        {Object.entries(entry.changes).map(([field, change]: [string, any]) => (
                                            <div key={field}>
                                                <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{field}:</span> {change}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                        <label className="label">Batch Name</label>
                        <input name="name" className="input" value={formData.name} onChange={handleChange} required />
                    </div>
                    <div>
                        <label className="label">Course</label>
                        <select
                            name="course"
                            className="input"
                            value={formData.course}
                            onChange={handleChange}
                            required
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
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                        <label className="label">Start Date</label>
                        <input type="date" name="start_date" className="input" value={formData.start_date} onChange={handleChange} required />
                    </div>
                    <div>
                        <label className="label">Strength</label>
                        <input type="number" name="strength" className="input" value={formData.strength} onChange={handleChange} required />
                    </div>
                </div>

                <div>
                    <label className="label">SHO Name</label>
                    <select
                        name="sho_name"
                        className="input"
                        value={formData.sho_name || ''}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select SHO</option>
                        {availableSHOs.map((sho, index) => (
                            <option key={index} value={sho.name}>{sho.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="label">Mode</label>
                    <select name="mode" className="input" value={formData.mode} onChange={handleChange}>
                        <option value="Offline">Offline</option>
                        <option value="Online">Online</option>
                    </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="btn"
                        style={{ backgroundColor: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        disabled={saving}
                    >
                        <Trash2 size={20} />
                        Delete Batch
                    </button>

                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        <Save size={20} style={{ marginRight: '0.5rem' }} />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    )
}

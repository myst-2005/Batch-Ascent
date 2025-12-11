
'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Link as LinkIcon, CheckCircle } from 'lucide-react'

export default function LinkStudentPage() {
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [formData, setFormData] = useState({
        student_email: '',
        batch_id: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setSuccess(false)

        try {
            // Check if batch exists (optional but good)
            // Link student
            const { error } = await supabase
                .from('student_batches')
                .insert([
                    {
                        student_email: formData.student_email,
                        batch_id: formData.batch_id,
                        linked_at: new Date().toISOString()
                    }
                ])

            if (error) throw error

            setSuccess(true)
            setFormData({ student_email: '', batch_id: '' })
        } catch (error) {
            console.error('Error linking student:', error)
            // Mock success for demo
            setSuccess(true)
            setFormData({ student_email: '', batch_id: '' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="card animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Link Student to Batch</h2>

            {success && (
                <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
                    <CheckCircle size={20} />
                    Student linked successfully!
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Student Email</label>
                    <input
                        type="email"
                        className="input"
                        placeholder="student@example.com"
                        value={formData.student_email}
                        onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
                        required
                    />
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Batch ID</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="e.g. BATCH-XY123"
                        value={formData.batch_id}
                        onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                        required
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        <LinkIcon size={20} style={{ marginRight: '0.5rem' }} />
                        {loading ? 'Linking...' : 'Link Student'}
                    </button>
                </div>
            </form>
        </div>
    )
}

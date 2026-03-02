'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Check, Send } from 'lucide-react'

export default function SalesIntimationPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        student_name: '',
        contact_number: '',
        email: '',
        admission_date: '',
        lead_creation_date: '',
        lead_source: '',
        lead_source_other: '',
        school: '',
        batch_code: '',
        verified_seats: '', // 'Yes' or 'No'
        payment_mode: '',
        emi_partner: '',
        total_sale_value: '',
        amount_paid: '',
        scholarships_notes: '',
        sales_executive_code: '',
        sales_executive_number: '',
        pledge_accepted: false
    })

    const [schoolsList, setSchoolsList] = useState<any[]>([])
    const [batchesList, setBatchesList] = useState<any[]>([])
    const [userSchool, setUserSchool] = useState<string | null>(null)
    const [userName, setUserName] = useState<string | null>(null)

    // Fetch User Profile and Schools on mount
    useEffect(() => {
        const initialize = async () => {
            try {
                // 1. Get Current User and their school
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('school, role, sales_id, phone, name')
                        .eq('id', user.id)
                        .single()

                    if (userData) {
                        setUserName(userData.name)
                        if (userData.school) {
                            setUserSchool(userData.school)
                            setFormData(prev => ({
                                ...prev,
                                school: userData.school,
                                sales_executive_code: userData.sales_id || '',
                                sales_executive_number: userData.phone || ''
                            }))
                        } else {
                            setFormData(prev => ({
                                ...prev,
                                sales_executive_code: userData.sales_id || '',
                                sales_executive_number: userData.phone || ''
                            }))
                        }
                    }

                    // 2. Fetch all Schools for the dropdown
                    const { data: schoolsData } = await supabase
                        .from('schools')
                        .select('*')
                        .order('name')

                    if (schoolsData) {
                        setSchoolsList(schoolsData)
                    }
                }
            } catch (err) {
                console.error('Error initializing page:', err)
            }
        }
        initialize()
    }, [])

    // Fetch Batches when school selection changes
    useEffect(() => {
        const fetchBatches = async () => {
            if (!formData.school) {
                setBatchesList([])
                return
            }

            try {
                // Fetch batches with their total strength and current count from sales_enrollments
                // Filter: Only show current batches (orientation upcoming or within last 2 days)
                const twoDaysAgo = new Date()
                twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
                const dateStr = twoDaysAgo.toISOString()

                const { data, error } = await supabase
                    .from('batches')
                    .select('id, name, strength, start_date')
                    .eq('school', formData.school)
                    .gte('start_date', dateStr)
                    .order('start_date', { ascending: false })

                if (error) throw error

                // For each batch, get the count of enrollments
                const batchesWithCounts = await Promise.all((data || []).map(async (batch) => {
                    const { count } = await supabase
                        .from('sales_enrollments')
                        .select('*', { count: 'exact', head: true })
                        .eq('batch_id', batch.id)

                    return {
                        ...batch,
                        current_count: count || 0,
                        is_full: count !== null && count >= batch.strength
                    }
                }))

                setBatchesList(batchesWithCounts)
            } catch (err) {
                console.error('Error fetching batches:', err)
            }
        }
        fetchBatches()
    }, [formData.school])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
        } else {
            setFormData(prev => ({ ...prev, [name]: value }))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.pledge_accepted) {
            alert('You must accept the pledge to submit.')
            return
        }

        setLoading(true)

        try {
            // 0. Get Current User
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('User not authenticated')

            // 1. Resolve Batch ID and Capacity Check
            const batchId = formData.batch_code
            const selectedBatch = batchesList.find(b => b.id === batchId)

            if (selectedBatch && selectedBatch.is_full) {
                throw new Error(`The batch "${selectedBatch.name}" is already full (${selectedBatch.current_count}/${selectedBatch.strength} seats).`)
            }

            // 2. Insert into Supabase (Detailed Data)
            if (batchId) {
                const { error } = await supabase
                    .from('sales_enrollments')
                    .insert([
                        {
                            sales_id: formData.sales_executive_code, // Use the Sales Code (e.g. TS-01) instead of UUID
                            batch_id: batchId,
                            student_name: formData.student_name,
                            student_email: formData.email,
                            student_phone: formData.contact_number,
                            enrolled_at: new Date().toISOString(),
                            status: 'Pending'
                        }
                    ])
                if (error) {
                    console.error('Supabase write error:', error)
                    throw new Error(`Supabase Error: ${error.message}`) // Throw so we don't proceed to Sheet
                }
            } else {
                throw new Error('Batch selection missing or invalid.')
            }

            // 3. Send to Google Sheets (Full Data)
            const googleSheetWebhookUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEBHOOK_URL
            if (googleSheetWebhookUrl) {
                // Find batch for readable name for the sheet
                const selectedBatch = batchesList.find(b => b.id === formData.batch_code)
                const batchDisplay = selectedBatch ? `${selectedBatch.name} (${selectedBatch.id})` : formData.batch_code

                await fetch(googleSheetWebhookUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...formData,
                        batch_code: batchDisplay, // Send readable name for the sheet
                        verified_seats: formData.verified_seats === 'Yes', // Convert to boolean for script logic
                        sales_executive_code: userName || 'Unknown', // Send Name in the Code field as requested
                        sales_executive_number: formData.sales_executive_number, // Send Phone Number here
                        submitted_at: new Date().toISOString(),
                        sales_user_id: user.id
                    })
                })
            } else {
                console.log("Google Sheet Webhook URL not configured. Payload:", formData)
                // We keep the alert silent or log it, but user specifically asked for this.
                // Assuming they might be adding it to .env now.
            }

            alert('Sales Intimation submitted successfully!')
            fetchRecentIntimations() // Refresh the list
            setFormData({
                student_name: '',
                contact_number: '',
                email: '',
                admission_date: '',
                lead_creation_date: '',
                lead_source: '',
                lead_source_other: '',
                school: userSchool || '', // Keep the school if possible
                batch_code: '',
                verified_seats: '',
                payment_mode: '',
                emi_partner: '',
                total_sale_value: '',
                amount_paid: '',
                scholarships_notes: '',
                sales_executive_code: '',
                sales_executive_number: '',
                pledge_accepted: false
            })

        } catch (error: any) {
            console.error('Error submitting form:', error)
            alert('Error submitting form: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const [recentIntimations, setRecentIntimations] = useState<any[]>([])
    const fetchRecentIntimations = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('sales_enrollments')
                .select('*, batches(name)')
                .eq('sales_id', user.id)
                .order('enrolled_at', { ascending: false })
                .limit(5)

            if (error) throw error
            setRecentIntimations(data || [])
        } catch (err) {
            console.error('Error fetching recent intimations:', err)
        }
    }

    useEffect(() => {
        fetchRecentIntimations()
    }, [])

    return (
        <div className="card animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={24} /> Sales Intimation Form
            </h2>
            <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                Purpose: To communicate all necessary post-sales student details for seamless onboarding, orientation, and academic handover.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>

                {/* Basic Student Details */}
                <section>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Basic Student Details</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        <div>
                            <label className="block mb-1 text-sm font-medium">Full Name of Student *</label>
                            <input type="text" name="student_name" className="input" required value={formData.student_name} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium">Contact Number (WhatsApp) *</label>
                            <input type="tel" name="contact_number" className="input" required value={formData.contact_number} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium">Email Address *</label>
                            <input type="email" name="email" className="input" required value={formData.email} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium">Date of Admission Confirmation *</label>
                            <input type="date" name="admission_date" className="input" required value={formData.admission_date} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium">Date of Lead Creation *</label>
                            <input type="date" name="lead_creation_date" className="input" required value={formData.lead_creation_date} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium">Leads Source *</label>
                            <select name="lead_source" className="input" required value={formData.lead_source} onChange={handleChange}>
                                <option value="">Select Source</option>
                                <option value="Ads">Ads</option>
                                <option value="Social Media">Social Media</option>
                                <option value="Referral">Referral</option>
                                <option value="Walk-in">Walk-in</option>
                                <option value="Website">Website</option>
                                <option value="WhatsApp">WhatsApp</option>
                                <option value="Others">Others</option>
                            </select>
                        </div>
                        {formData.lead_source === 'Others' && (
                            <div>
                                <label className="block mb-1 text-sm font-medium">Mention Source *</label>
                                <input type="text" name="lead_source_other" className="input" required value={formData.lead_source_other} onChange={handleChange} />
                            </div>
                        )}
                    </div>
                </section>

                {/* Program Details */}
                <section>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Program Details</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        <div>
                            <label className="block mb-1 text-sm font-medium">School *</label>
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
                                {schoolsList.map(s => <option key={s.id || s.name} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium">Batch Code *</label>
                            <select
                                name="batch_code"
                                className="input"
                                required
                                value={formData.batch_code}
                                onChange={handleChange}
                            >
                                <option value="">Select Batch</option>
                                {batchesList.map(batch => (
                                    <option
                                        key={batch.id}
                                        value={batch.id}
                                        disabled={batch.is_full}
                                        style={batch.is_full ? { color: 'var(--text-secondary)' } : {}}
                                    >
                                        {batch.name} ({batch.id}) {batch.is_full ? '- FULL' : `(${batch.current_count}/${batch.strength})`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>

                {/* Payment & Confirmation */}
                <section>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Payment & Confirmation</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        <div>
                            <label className="block mb-1 text-sm font-medium">Verified seats availability with Academics Lead? *</label>
                            <select name="verified_seats" className="input" required value={formData.verified_seats} onChange={handleChange}>
                                <option value="">Select...</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium">Payment Mode *</label>
                            <select name="payment_mode" className="input" required value={formData.payment_mode} onChange={handleChange}>
                                <option value="">Select Mode</option>
                                <option value="UPI">UPI</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Partial Payment">Partial Payment</option>
                                <option value="EMI">EMI</option>
                            </select>
                        </div>
                        {formData.payment_mode === 'EMI' && (
                            <div>
                                <label className="block mb-1 text-sm font-medium">EMI Partner *</label>
                                <select name="emi_partner" className="input" required value={formData.emi_partner} onChange={handleChange}>
                                    <option value="">Select Partner</option>
                                    <option value="Bajaj">Bajaj</option>
                                    <option value="Axio">Axio</option>
                                    <option value="Shopse">Shopse</option>
                                    <option value="Fee Monk">Fee Monk</option>
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block mb-1 text-sm font-medium">Total Sale Value *</label>
                            <input type="number" name="total_sale_value" className="input" required min="0" value={formData.total_sale_value} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium">Amount Paid Now *</label>
                            <input type="number" name="amount_paid" className="input" required min="0" value={formData.amount_paid} onChange={handleChange} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="block mb-1 text-sm font-medium">Scholarships, Discounts or Custom Deal Notes</label>
                            <textarea name="scholarships_notes" className="input" rows={3} value={formData.scholarships_notes} onChange={handleChange}></textarea>
                        </div>
                    </div>
                </section>

                {/* Internal details are now hidden and auto-filled */}

                {/* Pledge */}
                <section style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <input
                            type="checkbox"
                            name="pledge_accepted"
                            id="pledge"
                            checked={formData.pledge_accepted}
                            onChange={handleChange}
                            style={{ marginTop: '0.25rem' }}
                        />
                        <label htmlFor="pledge" style={{ fontSize: '0.875rem', lineHeight: '1.4' }}>
                            I pledge that there are no false promises or unverified details shared with the candidate. If any concerns are escalated, I will be happy to share the proofs to support my claims. I take full responsibility for the data in this form.
                        </label>
                    </div>
                </section>

                <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
                    {loading ? 'Submitting...' : 'Submit Intimation'}
                </button>
            </form>

            {/* Recent Intimations List */}
            <div className="card mt-12" style={{ marginTop: '3rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Your Recent Intimations</h3>
                {recentIntimations.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No recent submissions found.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '0.75rem' }}>Student Name</th>
                                    <th style={{ padding: '0.75rem' }}>Batch</th>
                                    <th style={{ padding: '0.75rem' }}>Date</th>
                                    <th style={{ padding: '0.75rem' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentIntimations.map((intimation) => (
                                    <tr key={intimation.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                                        <td style={{ padding: '0.75rem' }}>{intimation.student_name}</td>
                                        <td style={{ padding: '0.75rem' }}>{intimation.batches?.name || intimation.batch_id}</td>
                                        <td style={{ padding: '0.75rem' }}>{intimation.enrolled_at ? new Date(intimation.enrolled_at).toLocaleDateString() : 'N/A'}</td>
                                        <td style={{ padding: '0.75rem' }}>
                                            <span style={{
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '4px',
                                                background: intimation.status === 'Verified' ? '#dcfce7' : '#fef3c7',
                                                color: intimation.status === 'Verified' ? '#16a34a' : '#b45309',
                                                fontSize: '0.75rem',
                                                fontWeight: '600'
                                            }}>
                                                {intimation.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

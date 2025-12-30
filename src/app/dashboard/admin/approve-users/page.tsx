'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { CheckCircle, XCircle } from 'lucide-react'
import { SCHOOLS, ROLES } from '@/lib/constants'

export default function ApproveUsersPage() {
    const [pendingUsers, setPendingUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchPendingUsers()
    }, [])

    const fetchPendingUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'PENDING')
                .order('created_at', { ascending: false })

            if (error) throw error
            // Initialize requested_role/school if needed, though they should be from DB
            if (data) {
                setPendingUsers(data.map(u => ({
                    ...u,
                    selectedRole: u.requested_role || 'SALES',
                    selectedSchool: u.school || SCHOOLS[0]
                })))
            }
        } catch (error) {
            console.error('Error fetching pending users:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateLocalUser = (id: string, field: 'selectedRole' | 'selectedSchool', value: string) => {
        setPendingUsers(prev => prev.map(u =>
            u.id === id ? { ...u, [field]: value } : u
        ))
    }

    const handleApprove = async (user: any) => {
        if (!confirm(`Approve ${user.email} as ${user.selectedRole} in ${user.selectedSchool}?`)) return

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    role: user.selectedRole,
                    school: user.selectedSchool
                })
                .eq('id', user.id)

            if (error) throw error
            alert('User approved and role assigned.')
            fetchPendingUsers()
        } catch (error: any) {
            alert('Error approving user: ' + error.message)
        }
    }

    const handleReject = async (id: string) => {
        if (!confirm('Reject and delete this user request?')) return
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const response = await fetch('/api/delete-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ id })
            })

            if (!response.ok) throw new Error('Failed to delete')

            alert('User rejected.')
            fetchPendingUsers()
        } catch (error: any) {
            alert('Error rejecting user: ' + error.message)
        }
    }

    return (
        <div className="animate-fade-in">
            <div className="card">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Pending Approvals</h3>
                {pendingUsers.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>No pending approvals found.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '1rem' }}>Name</th>
                                    <th style={{ padding: '1rem' }}>Email</th>
                                    <th style={{ padding: '1rem' }}>Role</th>
                                    <th style={{ padding: '1rem' }}>School</th>
                                    <th style={{ padding: '1rem' }}>Date</th>
                                    <th style={{ padding: '1rem' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingUsers.map(user => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1rem' }}>{user.name || 'N/A'}</td>
                                        <td style={{ padding: '1rem' }}>{user.email}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <select
                                                className="input"
                                                value={user.selectedRole}
                                                onChange={(e) => handleUpdateLocalUser(user.id, 'selectedRole', e.target.value)}
                                                style={{ padding: '0.25rem', fontSize: '0.875rem' }}
                                            >
                                                {Object.values(ROLES)
                                                    .filter(r => r !== 'PENDING')
                                                    .map(role => (
                                                        <option key={role} value={role}>{role}</option>
                                                    ))}
                                            </select>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <select
                                                className="input"
                                                value={user.selectedSchool}
                                                onChange={(e) => handleUpdateLocalUser(user.id, 'selectedSchool', e.target.value)}
                                                style={{ padding: '0.25rem', fontSize: '0.875rem' }}
                                            >
                                                {SCHOOLS.map(school => (
                                                    <option key={school} value={school}>{school}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={{ padding: '1rem' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => handleApprove(user)}
                                                className="btn btn-primary"
                                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                                            >
                                                <CheckCircle size={16} style={{ marginRight: '4px' }} /> Approve
                                            </button>
                                            <button
                                                onClick={() => handleReject(user.id)}
                                                className="btn btn-secondary"
                                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', color: 'var(--error)', borderColor: 'var(--error)' }}
                                            >
                                                <XCircle size={16} style={{ marginRight: '4px' }} /> Reject
                                            </button>
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

'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { UserPlus, Trash2, Filter } from 'lucide-react'
import { SCHOOLS, ROLES } from '@/lib/constants'

export default function AdminUsersPage() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        role: 'SHO',
        school: SCHOOLS[0]
    })

    // Filter states
    const [filterSchool, setFilterSchool] = useState('ALL')
    const [filterRole, setFilterRole] = useState('ALL')

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false })
            if (error) throw error
            if (data) setUsers(data)
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const { data: { session } } = await supabase.auth.getSession()

            const response = await fetch('/api/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify(newUser)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to invite user')
            }

            alert(`User invited successfully! Supabase has sent an email to ${newUser.email}.`)
            setNewUser({ name: '', email: '', role: 'SHO', school: SCHOOLS[0] })
            fetchUsers()
        } catch (error: any) {
            alert('Error inviting user: ' + error.message)
        }
    }

    const handleDeleteUser = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user? This will remove their login access.')) return

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

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete user')
            }

            fetchUsers()
        } catch (error: any) {
            alert('Error deleting user: ' + error.message)
        }
    }

    // Apply filters
    const filteredUsers = users.filter(user => {
        const matchesSchool = filterSchool === 'ALL' || user.school === filterSchool
        const matchesRole = filterRole === 'ALL' || user.role === filterRole
        return matchesSchool && matchesRole
    })

    return (
        <div className="animate-fade-in">
            <div className="card mb-8" style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Add New User</h3>
                <form onSubmit={handleCreateUser} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <input
                        type="text"
                        placeholder="Full Name"
                        className="input"
                        value={newUser.name}
                        onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                        required
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        className="input"
                        value={newUser.email}
                        onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                        required
                    />

                    <select
                        className="input"
                        value={newUser.role}
                        onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                    >
                        {Object.values(ROLES).map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>

                    {newUser.role !== 'ADMIN' && newUser.role !== 'CEO' && (
                        <select
                            className="input"
                            value={newUser.school}
                            onChange={e => setNewUser({ ...newUser, school: e.target.value as any })}
                        >
                            {SCHOOLS.map(school => (
                                <option key={school} value={school}>{school}</option>
                            ))}
                        </select>
                    )}

                    <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>
                        <UserPlus size={20} style={{ marginRight: '0.5rem' }} />
                        Invite User
                    </button>
                </form>
            </div>

            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Existing Users ({filteredUsers.length})</h3>

                    {/* Filters */}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Filter size={16} color="var(--text-secondary)" />
                            <select
                                className="input"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                value={filterSchool}
                                onChange={(e) => setFilterSchool(e.target.value)}
                            >
                                <option value="ALL">All Schools</option>
                                {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <select
                                className="input"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                            >
                                <option value="ALL">All Roles</option>
                                {Object.values(ROLES).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1rem', width: '50px' }}>Sl No</th>
                                <th style={{ padding: '1rem' }}>Name</th>
                                <th style={{ padding: '1rem' }}>Email</th>
                                <th style={{ padding: '1rem' }}>Role</th>
                                <th style={{ padding: '1rem' }}>School</th>
                                <th style={{ padding: '1rem' }}>Sales ID</th>
                                <th style={{ padding: '1rem' }}>Cliq ID</th>
                                <th style={{ padding: '1rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user, index) => (
                                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem', color: 'var(--text-tertiary)' }}>{index + 1}</td>
                                    <td style={{ padding: '1rem' }}>{user.name}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{user.email}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <select
                                            className="input"
                                            value={user.role}
                                            onChange={(e) => {
                                                const newRole = e.target.value
                                                setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u))
                                            }}
                                            style={{ padding: '0.25rem', fontSize: '0.875rem' }}
                                        >
                                            {Object.values(ROLES).map(role => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <select
                                            className="input"
                                            value={user.school || ''}
                                            onChange={(e) => {
                                                const newSchool = e.target.value
                                                setUsers(users.map(u => u.id === user.id ? { ...u, school: newSchool } : u))
                                            }}
                                            style={{ padding: '0.25rem', fontSize: '0.875rem', maxWidth: '150px' }}
                                        >
                                            <option value="">-</option>
                                            {SCHOOLS.map(school => (
                                                <option key={school} value={school}>{school}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <input
                                            type="text"
                                            className="input"
                                            value={user.sales_id || ''}
                                            onChange={(e) => {
                                                const newId = e.target.value
                                                setUsers(users.map(u => u.id === user.id ? { ...u, sales_id: newId } : u))
                                            }}
                                            style={{ padding: '0.25rem', fontSize: '0.875rem', width: '100px' }}
                                            placeholder="-"
                                        />
                                    </td>
                                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{user.cliq_id || '-'}</td>
                                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <button
                                            onClick={async () => {
                                                if (!confirm(`Are you sure you want to update ${user.email}?\nRole: ${user.role}\nSchool: ${user.school || 'None'}`)) return

                                                try {
                                                    const res = await fetch('/api/update-user', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            id: user.id,
                                                            role: user.role,
                                                            school: user.school,
                                                            sales_id: user.sales_id
                                                        })
                                                    })

                                                    if (!res.ok) throw new Error('Failed to update')
                                                    alert('User updated successfully')
                                                } catch (err: any) {
                                                    alert('Error updating user: ' + err.message)
                                                }
                                            }}
                                            className="btn-primary"
                                            style={{
                                                padding: '0.25rem 0.5rem',
                                                fontSize: '0.75rem',
                                                marginRight: '0.5rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const cliqId = prompt('Enter Cliq ID:', user.cliq_id || '')
                                                if (cliqId === null) return
                                                // ... existing Cliq ID logic is separate, or we can merge it.
                                                // For now keeping it separate as getting too complex in one step
                                                try {
                                                    const res = await fetch('/api/update-user', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            id: user.id,
                                                            cliq_id: cliqId
                                                        })
                                                    })
                                                    if (!res.ok) throw new Error('Failed to update')
                                                    fetchUsers()
                                                } catch (err) { alert('Error updating Cliq ID') }
                                            }}
                                            className="btn-secondary"
                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                            title="Set Cliq ID"
                                        >
                                            ID
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user.id)}
                                            style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface ActivityLog {
    id: string
    user_id: string | null
    user_name: string
    user_email: string
    user_role: string
    action: string
    details: Record<string, any>
    ip_address: string
    user_agent: string
    created_at: string
}

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
    LOGIN: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
    ROLE_CHANGE: { bg: 'rgba(249,115,22,0.15)', color: '#f97316' },
    USER_UPDATE: { bg: 'rgba(168,85,247,0.15)', color: '#a855f7' },
    USER_INVITE: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    USER_DELETE: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    STUDENT_ADDED: { bg: 'rgba(20,184,166,0.15)', color: '#14b8a6' },
    STUDENT_REMOVED: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    STUDENT_TRANSFERRED: { bg: 'rgba(99,102,241,0.15)', color: '#6366f1' },
    BATCH_UPDATED: { bg: 'rgba(107,114,128,0.15)', color: '#6b7280' },
}

function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    })
}

function formatDetails(details: Record<string, any>) {
    if (!details || typeof details !== 'object') return ''
    return Object.entries(details)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(', ')
}

function ActionBadge({ action }: { action: string }) {
    const style = ACTION_COLORS[action] || { bg: 'rgba(107,114,128,0.15)', color: '#6b7280' }
    return (
        <span style={{
            display: 'inline-block',
            padding: '0.2rem 0.6rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: style.bg,
            color: style.color,
            whiteSpace: 'nowrap'
        }}>
            {action}
        </span>
    )
}

const ACTION_OPTIONS = [
    'ALL',
    'LOGIN',
    'ROLE_CHANGE',
    'USER_UPDATE',
    'USER_INVITE',
    'USER_DELETE',
    'STUDENT_ADDED',
    'STUDENT_REMOVED',
    'STUDENT_TRANSFERRED',
    'BATCH_UPDATED',
]

export default function ActivityLogsPage() {
    const [logs, setLogs] = useState<ActivityLog[]>([])
    const [loading, setLoading] = useState(true)
    const [actionFilter, setActionFilter] = useState('ALL')
    const [searchQuery, setSearchQuery] = useState('')

    const fetchLogs = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false })

        if (!error && data) {
            setLogs(data as ActivityLog[])
        } else {
            console.error('Failed to fetch logs:', error)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchLogs()
    }, [])

    const filtered = logs.filter(log => {
        const matchesAction = actionFilter === 'ALL' || log.action === actionFilter
        const q = searchQuery.toLowerCase()
        const matchesSearch =
            !q ||
            (log.user_name || '').toLowerCase().includes(q) ||
            (log.user_email || '').toLowerCase().includes(q)
        return matchesAction && matchesSearch
    })

    return (
        <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Activity Logs</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'} found
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={fetchLogs}
                    disabled={loading}
                    style={{ minWidth: '100px' }}
                >
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            {/* Filters */}
            <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                    className="input"
                    value={actionFilter}
                    onChange={e => setActionFilter(e.target.value)}
                    style={{ minWidth: '160px', flex: '0 0 auto' }}
                >
                    {ACTION_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt === 'ALL' ? 'All Actions' : opt}</option>
                    ))}
                </select>
                <input
                    className="input"
                    type="text"
                    placeholder="Search by user name or email..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ flex: '1', minWidth: '200px' }}
                />
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Loading activity logs...
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No activity logs found.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>#</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Time</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>User</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Role</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Action</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Details</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>IP Address</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Device</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((log, idx) => (
                                    <tr
                                        key={log.id}
                                        style={{
                                            borderBottom: '1px solid var(--border)',
                                            transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                                    >
                                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                            {formatDate(log.created_at)}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                                            <div style={{ fontWeight: 600 }}>{log.user_name || '—'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.user_email || ''}</div>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                                            {log.user_role || '—'}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <ActionBadge action={log.action} />
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', maxWidth: '300px', wordBreak: 'break-word', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                            {formatDetails(log.details)}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {log.ip_address || '—'}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', maxWidth: '200px', wordBreak: 'break-word', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {log.user_agent || '—'}
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

'use client'
import { useEffect, useState } from 'react'
import BatchList from '@/components/BatchList'
import ProjectOverview from '@/components/ProjectOverview'

export default function DashboardPage() {
    const [role, setRole] = useState<string | null>(null)

    useEffect(() => {
        setRole(localStorage.getItem('userRole'))
    }, [])

    if (!role) return null

    // Project Lead and CEO get the Analytics Dashboard
    if (role === 'PROJECT_LEAD' || role === 'CEO') {
        return <ProjectOverview />
    }

    // Others (SHO, SSHO, Admin, Academic Lead, Sales Head) get Batch List
    return (
        <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Overview</h2>
            <BatchList />
        </div>
    )
}

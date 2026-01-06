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

    // Everyone gets the Batch List as the main Overview now.
    // Detailed analytics are moved to the 'Status' page.
    return (
        <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Overview</h2>
            <ProjectOverview />
            <BatchList />
        </div>
    )
}

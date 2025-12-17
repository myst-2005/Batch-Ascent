'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const [authorized, setAuthorized] = useState(false)

    useEffect(() => {
        const role = localStorage.getItem('userRole')
        if (role !== 'ADMIN') {
            router.push('/dashboard')
        } else {
            setAuthorized(true)
        }
    }, [router])

    if (!authorized) return null

    return <>{children}</>
}

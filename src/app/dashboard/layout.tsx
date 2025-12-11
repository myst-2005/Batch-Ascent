
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, PlusCircle, Users, LogOut, Link as LinkIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import styles from './dashboard.module.css'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [role, setRole] = useState<string | null>(null)
    const [userName, setUserName] = useState<string>('User')
    const [isCollapsed, setIsCollapsed] = useState(false)

    useEffect(() => {
        const storedRole = localStorage.getItem('userRole')
        if (!storedRole) {
            router.push('/')
        } else {
            setRole(storedRole)
            setUserName(localStorage.getItem('userName') || 'User')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (!role) return null

    const navItems = [
        { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, roles: ['SHO', 'ACADEMIC_LEAD', 'ADMIN'] },
        { label: 'Sales Dashboard', href: '/dashboard/sales', icon: Users, roles: ['SALES'] },
        { label: 'Create Batch', href: '/dashboard/create-batch', icon: PlusCircle, roles: ['ACADEMIC_LEAD'] },
        { label: 'Link Student', href: '/dashboard/link-student', icon: LinkIcon, roles: ['SHO', 'ACADEMIC_LEAD'] },
        { label: 'Manage Users', href: '/dashboard/admin/users', icon: Users, roles: ['ADMIN'] },
    ]

    return (
        <div className={styles.layout}>
            <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
                <div className={styles.logo} style={{ gap: isCollapsed ? '0' : '1rem', justifyContent: isCollapsed ? 'center' : 'flex-start', paddingLeft: isCollapsed ? '0' : '1rem' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        position: 'relative',
                        flexShrink: 0
                    }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/logo.jpg"
                            alt="Logo"
                            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }}
                        />
                    </div>
                    {!isCollapsed && <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>Batch Ascent</span>}
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => (
                        item.roles.includes(role) && (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
                                style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '0.75rem' : '0.75rem 1rem' }}
                                title={isCollapsed ? item.label : ''}
                            >
                                <item.icon size={20} />
                                {!isCollapsed && item.label}
                            </Link>
                        )
                    ))}
                </nav>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={styles.navItem}
                        style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '0.75rem' : '0.75rem 1rem' }}
                    >
                        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                        {!isCollapsed && 'Collapse'}
                    </button>

                    <button
                        onClick={() => {
                            localStorage.removeItem('userRole')
                            localStorage.removeItem('userName')
                            router.push('/')
                        }}
                        className={styles.navItem}
                        style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '0.75rem' : '0.75rem 1rem' }}
                        title={isCollapsed ? 'Sign Out' : ''}
                    >
                        <LogOut size={20} />
                        {!isCollapsed && 'Sign Out'}
                    </button>
                </div>
            </aside>

            <main className={styles.main}>
                <header className={styles.header}>
                    <h2 className={styles.title}>
                        {navItems.find(i => i.href === pathname)?.label || 'Dashboard'}
                    </h2>
                    <div className={styles.userProfile}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 'bold' }}>{userName}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{role}</div>
                        </div>
                        <div style={{ width: '2.5rem', height: '2.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={20} />
                        </div>
                    </div>
                </header>
                {children}
            </main>
        </div>
    )
}


'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, PlusCircle, Users, LogOut, Link as LinkIcon, ChevronLeft, ChevronRight, BookOpen, Menu, TrendingUp, History, Activity } from 'lucide-react'
import styles from './dashboard.module.css'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [role, setRole] = useState<string | null>(null)
    const [userName, setUserName] = useState<string>('User')
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isMobileOpen, setIsMobileOpen] = useState(false)

    useEffect(() => {
        const storedRole = localStorage.getItem('userRole')
        if (!storedRole || storedRole === 'PENDING') {
            if (storedRole === 'PENDING') {
                // Clear invalid session if any
                localStorage.removeItem('userRole')
            }
            router.push('/')
        } else {
            setRole(storedRole)
            setUserName(localStorage.getItem('userName') || 'User')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileOpen(false)
    }, [pathname])

    if (!role) return null

    const navItems = [
        { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, roles: ['SHO', 'ACADEMIC_LEAD', 'ADMIN', 'PROJECT_LEAD', 'SSHO', 'SALES_HEAD', 'CEO'] },
        { label: 'Status', href: '/dashboard/status', icon: TrendingUp, roles: ['ADMIN', 'CEO', 'PROJECT_LEAD'] },
        { label: 'Sales Dashboard', href: '/dashboard/sales', icon: Users, roles: ['SALES', 'SALES_HEAD', 'ADMIN', 'CEO'] },
        { label: 'Sales Intimation', href: '/dashboard/sales/intimation', icon: PlusCircle, roles: ['SALES', 'SALES_HEAD', 'ADMIN', 'CEO'] },
        { label: 'Batches', href: '/dashboard/batches', icon: BookOpen, roles: ['PROJECT_LEAD', 'CEO', 'SALES_HEAD', 'ADMIN'] },
        { label: 'Past Batches', href: '/dashboard/past-batches', icon: History, roles: ['ACADEMIC_LEAD', 'SHO', 'SALES_HEAD', 'ADMIN', 'CEO'] },
        { label: 'Create Batch', href: '/dashboard/create-batch', icon: PlusCircle, roles: ['ACADEMIC_LEAD', 'ADMIN', 'CEO'] },
        { label: 'Link Student', href: '/dashboard/link-student', icon: LinkIcon, roles: ['SHO', 'ACADEMIC_LEAD', 'SSHO', 'ADMIN', 'SALES_HEAD', 'CEO'] },
        { label: 'Manage Schools & Courses', href: '/dashboard/admin/schools', icon: BookOpen, roles: ['ADMIN', 'CEO'] },
        { label: 'Manage Users', href: '/dashboard/admin/users', icon: Users, roles: ['ADMIN', 'SUB_ADMIN', 'CEO'] },
        { label: 'Approve Users', href: '/dashboard/admin/approve-users', icon: Users, roles: ['ADMIN', 'SUB_ADMIN', 'CEO'] },
        { label: 'Activity Logs', href: '/dashboard/admin/logs', icon: Activity, roles: ['ADMIN', 'CEO'] },
    ]

    return (
        <div className={styles.layout}>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className={styles.mobileOverlay}
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} ${isMobileOpen ? styles.mobileOpen : ''}`}>
                <div className={styles.logo} style={{ gap: (isCollapsed && !isMobileOpen) ? '0' : '1rem', justifyContent: (isCollapsed && !isMobileOpen) ? 'center' : 'flex-start', paddingLeft: (isCollapsed && !isMobileOpen) ? '0' : '1rem' }}>
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
                    {(!isCollapsed || isMobileOpen) && <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>Batch Ascent</span>}
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => (
                        item.roles.includes(role) && (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
                                style={{ justifyContent: (isCollapsed && !isMobileOpen) ? 'center' : 'flex-start', padding: (isCollapsed && !isMobileOpen) ? '0.75rem' : '0.75rem 1rem' }}
                                title={(isCollapsed && !isMobileOpen) ? item.label : ''}
                                onClick={() => setIsMobileOpen(false)}
                            >
                                <item.icon size={20} />
                                {(!isCollapsed || isMobileOpen) && item.label}
                            </Link>
                        )
                    ))}
                </nav>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* Hide Collapse button on mobile since it's a drawer */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={styles.navItem}
                        style={{
                            width: '100%',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            justifyContent: (isCollapsed && !isMobileOpen) ? 'center' : 'flex-start',
                            padding: (isCollapsed && !isMobileOpen) ? '0.75rem' : '0.75rem 1rem',
                            display: isMobileOpen ? 'none' : 'flex'
                        }}
                    >
                        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                        {(!isCollapsed || isMobileOpen) && 'Collapse'}
                    </button>

                    <button
                        onClick={() => {
                            localStorage.removeItem('userRole')
                            localStorage.removeItem('userName')
                            router.push('/')
                        }}
                        className={styles.navItem}
                        style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', justifyContent: (isCollapsed && !isMobileOpen) ? 'center' : 'flex-start', padding: (isCollapsed && !isMobileOpen) ? '0.75rem' : '0.75rem 1rem' }}
                        title={(isCollapsed && !isMobileOpen) ? 'Sign Out' : ''}
                    >
                        <LogOut size={20} />
                        {(!isCollapsed || isMobileOpen) && 'Sign Out'}
                    </button>
                </div>
            </aside>

            <main className={styles.main}>
                <header className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            className={styles.mobileToggle}
                            onClick={() => setIsMobileOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <h2 className={styles.title}>
                            {navItems.find(i => i.href === pathname)?.label || 'Dashboard'}
                        </h2>
                    </div>
                    <div className={`${styles.userProfile} ${styles.desktopOnly}`}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 'bold' }}>{userName}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{role}</div>
                        </div>
                        {/* Mobile-only compact profile info could go here if needed, but the avatar is enough */}
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

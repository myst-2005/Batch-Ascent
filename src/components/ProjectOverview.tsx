'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts'
import { BookOpen, Users, TrendingUp } from 'lucide-react'

interface Batch {
    id: string
    course: string
    enrolled_count: number
    strength: number
    school?: string
}

import { SCHOOLS } from '@/lib/constants'

export default function ProjectOverview() {
    const [batches, setBatches] = useState<Batch[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedSchool, setSelectedSchool] = useState<string>('All Schools')
    const [userRole, setUserRole] = useState<string | null>(null)
    const [stats, setStats] = useState({
        totalBatches: 0,
        totalStudents: 0,
        batchesPerCourse: [] as { name: string, count: number }[],
        batchesPerSchool: [] as { name: string, count: number }[],
        mostPopularCourse: '',
        enrollmentRate: 0,
        topSalesPerson: '',
        salesPerformance: [] as { name: string, count: number }[]
    })

    useEffect(() => {
        const role = localStorage.getItem('userRole')
        setUserRole(role)
        fetchData(role, selectedSchool)
    }, [selectedSchool])

    const fetchData = async (role: string | null, schoolFilter: string) => {
        try {
            setLoading(true)

            // 1. Fetch Batches
            let batchQuery = supabase.from('batches').select('id, course, strength, school')

            if (role === 'CEO' || role === 'ADMIN') {
                if (schoolFilter !== 'All Schools') {
                    batchQuery = batchQuery.eq('school', schoolFilter)
                }
            } else {
                const userSchool = localStorage.getItem('userSchool')
                if (userSchool) {
                    batchQuery = batchQuery.eq('school', userSchool)
                }
            }

            const { data: batchesData, error: batchError } = await batchQuery
            if (batchError) throw batchError

            // ... (rest of filtering) ...

            // 2. Fetch Sales References (Users)
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('name, sales_id')
                .not('sales_id', 'is', null)

            if (usersError) console.error('Error fetching users:', usersError)

            // 3. Process Batch Data & Fetch Enrollments
            let allBatches: Batch[] = []
            let allSalesIds: string[] = []

            if (batchesData) {
                // Fetch enrolled counts and accumulate sales_ids
                // We need to fetch student_batches for these batches to get sales stats relevant to the filtered view
                const batchIds = batchesData.map(b => b.id)

                const { data: enrollments, error: enrollError } = await supabase
                    .from('student_batches')
                    .select('batch_id, sales_id')
                    .in('batch_id', batchIds) // Only fetch enrollments for visible batches

                if (enrollError) throw enrollError

                // Map counts to batches
                allBatches = batchesData.map(batch => {
                    const count = enrollments?.filter(e => e.batch_id === batch.id).length || 0
                    return { ...batch, enrolled_count: count }
                })

                // Collect sales IDs for stats
                if (enrollments) {
                    allSalesIds = enrollments.map(e => e.sales_id).filter(Boolean) as string[]
                }
            }

            setBatches(allBatches)
            calculateStats(allBatches, allSalesIds, usersData || [])

        } catch (error) {
            console.error('Error fetching stats:', error)
        } finally {
            setLoading(false)
        }
    }

    const calculateStats = (batchData: Batch[], salesIds: string[], usersMap: any[]) => {
        const totalBatches = batchData.length
        const totalStudents = batchData.reduce((acc, curr) => acc + (curr.enrolled_count || 0), 0)
        const totalCapacity = batchData.reduce((acc, curr) => acc + (curr.strength || 0), 0)

        // Batches per course
        const courses: Record<string, number> = {}
        const studentsPerCourse: Record<string, number> = {}
        const schools: Record<string, number> = {}

        batchData.forEach(b => {
            courses[b.course] = (courses[b.course] || 0) + 1
            studentsPerCourse[b.course] = (studentsPerCourse[b.course] || 0) + (b.enrolled_count || 0)
            if (b.school) schools[b.school] = (schools[b.school] || 0) + 1
        })

        const batchesPerCourseArg = Object.entries(courses).map(([name, count]) => ({
            name,
            count
        }))

        const batchesPerSchoolArg = Object.entries(schools).map(([name, count]) => ({
            name,
            count
        })).sort((a, b) => b.count - a.count)

        // Most popular course
        let mostPopular = ''
        let maxStudents = 0
        Object.entries(studentsPerCourse).forEach(([course, count]) => {
            if (count > maxStudents) {
                maxStudents = count
                mostPopular = course
            }
        })

        // Sales Performance
        const salesCounts: Record<string, number> = {}
        salesIds.forEach(id => {
            salesCounts[id] = (salesCounts[id] || 0) + 1
        })

        let topSalesPersonName = '-'
        let maxSales = 0

        const salesPerformanceArg = Object.entries(salesCounts).map(([id, count]) => {
            const user = usersMap.find(u => u.sales_id === id)
            const name = user ? user.name : id // Fallback to ID if name not found

            if (count > maxSales) {
                maxSales = count
                topSalesPersonName = name
            }

            return { name, count }
        }).sort((a, b) => b.count - a.count).slice(0, 5) // Top 5

        setStats({
            totalBatches,
            totalStudents,
            batchesPerCourse: batchesPerCourseArg,
            batchesPerSchool: batchesPerSchoolArg,
            mostPopularCourse: mostPopular,
            enrollmentRate: totalCapacity > 0 ? (totalStudents / totalCapacity) * 100 : 0,
            topSalesPerson: topSalesPersonName,
            salesPerformance: salesPerformanceArg
        })
    }

    if (loading) return <div className="animate-pulse">Loading analytics...</div>

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="text-2xl font-bold" style={{ color: 'var(--primary)', margin: 0 }}>Dashboard Overview</h2>

                {(userRole === 'CEO' || userRole === 'ADMIN') && (
                    <select
                        value={selectedSchool}
                        onChange={(e) => setSelectedSchool(e.target.value)}
                        className="input"
                        style={{ width: 'auto', minWidth: '200px' }}
                    >
                        <option value="All Schools">All Schools</option>
                        {SCHOOLS.map(school => (
                            <option key={school} value={school}>{school}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Batches</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalBatches}</div>
                    </div>
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' }}>
                        <Users size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Students</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalStudents}</div>
                    </div>
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Top Course</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.mostPopularCourse || '-'}</div>
                    </div>
                </div>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}>
                        <Users size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Top Salesperson</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{stats.topSalesPerson}</div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>

                {/* Batches Per Course */}
                <div className="card">
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Batches per Course</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.batchesPerCourse}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                    cursor={{ fill: 'var(--surface-hover)' }}
                                />
                                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Course Distribution */}
                <div className="card">
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Course Distribution</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.batchesPerCourse}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="count"
                                    label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                >
                                    {stats.batchesPerCourse.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* School Distribution Chart for Admin/CEO */}
            {(userRole === 'ADMIN' || userRole === 'CEO') && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Batches per School</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.batchesPerSchool}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                    cursor={{ fill: 'var(--surface-hover)' }}
                                />
                                <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Sales Performance Row */}
            {(userRole === 'CEO' || userRole === 'SALES_HEAD' || userRole === 'ADMIN') && (
                <div className="card">
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Star Sales Performance (Top 5)</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.salesPerformance} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" />
                                <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                    cursor={{ fill: 'var(--surface-hover)' }}
                                />
                                <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    )
}

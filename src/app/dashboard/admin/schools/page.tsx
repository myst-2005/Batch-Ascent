'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Plus, Trash2, School, BookOpen } from 'lucide-react'

export default function AdminSchoolsPage() {
    const [schools, setSchools] = useState<any[]>([])
    const [courses, setCourses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [newSchool, setNewSchool] = useState<{ name: string, code: string, last_code?: number }>({ name: '', code: '' })
    const [newCourse, setNewCourse] = useState<{ name: string, code: string, school_name: string }>({ name: '', code: '', school_name: '' })

    const [userRole, setUserRole] = useState<string | null>(null)

    useEffect(() => {
        const storedRole = localStorage.getItem('userRole')
        setUserRole(storedRole)
        fetchSchools()
        fetchCourses()
    }, [])

    const fetchSchools = async () => {
        try {
            const { data, error } = await supabase
                .from('schools')
                .select('*')
                .order('name', { ascending: true })

            if (error) throw error
            if (data) setSchools(data)
        } catch (error) {
            console.error('Error fetching schools:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchCourses = async () => {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .order('name', { ascending: true })

            if (error) throw error
            if (data) setCourses(data)
        } catch (error) {
            console.error('Error fetching courses:', error)
        }
    }

    const handleAddSchool = async (e: React.FormEvent) => {
        e.preventDefault()
        if (userRole !== 'ADMIN') return alert('Only admins can add schools')
        try {
            const { error } = await supabase
                .from('schools')
                .insert([newSchool])

            if (error) throw error

            setNewSchool({ name: '', code: '' })
            fetchSchools()
            alert('School added successfully!')
        } catch (error: any) {
            alert('Error adding school: ' + error.message)
        }
    }

    const handleAddCourse = async (e: React.FormEvent) => {
        e.preventDefault()
        if (userRole !== 'ADMIN') return alert('Only admins can add courses')
        try {
            const { error } = await supabase
                .from('courses')
                .insert([newCourse])

            if (error) throw error

            setNewCourse({ name: '', code: '', school_name: '' })
            fetchCourses()
            alert('Course added successfully!')
        } catch (error: any) {
            alert('Error adding course: ' + error.message)
        }
    }

    const handleDeleteCourse = async (id: string) => {
        if (userRole !== 'ADMIN') return alert('Only admins can delete courses')
        if (!confirm('Are you sure you want to delete this course?')) return

        try {
            const { error } = await supabase
                .from('courses')
                .delete()
                .eq('id', id)

            if (error) throw error
            fetchCourses()
        } catch (error: any) {
            alert('Error deleting course: ' + error.message)
        }
    }

    const handleDeleteSchool = async (id: string) => {
        if (userRole !== 'ADMIN') return alert('Only admins can delete schools')
        if (!confirm('Are you sure? This might affect existing batches.')) return

        try {
            const { error } = await supabase
                .from('schools')
                .delete()
                .eq('id', id)

            if (error) throw error
            fetchSchools()
        } catch (error: any) {
            alert('Error deleting school: ' + error.message)
        }
    }

    const [editingCourse, setEditingCourse] = useState<any>(null)

    const handleUpdateCourse = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const { error } = await supabase
                .from('courses')
                .update({
                    name: editingCourse.name,
                    code: editingCourse.code,
                    school_name: editingCourse.school_name
                })
                .eq('id', editingCourse.id)

            if (error) throw error

            setEditingCourse(null)
            fetchCourses()
            alert('Course updated successfully!')
        } catch (error: any) {
            alert('Error updating course: ' + error.message)
        }
    }

    return (
        <div className="animate-fade-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <School /> Manage Schools
            </h2>

            {/* Add School Form - ADMIN ONLY */}
            {userRole === 'ADMIN' && (
                <div className="card mb-8" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Add New School</h3>
                    <form onSubmit={handleAddSchool} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <input
                            type="text"
                            placeholder="School Name (e.g. AI School)"
                            className="input"
                            value={newSchool.name}
                            onChange={e => setNewSchool({ ...newSchool, name: e.target.value })}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Code (e.g. AI)"
                            className="input"
                            value={newSchool.code}
                            onChange={e => setNewSchool({ ...newSchool, code: e.target.value.toUpperCase() })}
                            required
                            maxLength={3}
                        />
                        <input
                            type="number"
                            placeholder="Last Sequence (Optional)"
                            className="input"
                            value={newSchool.last_code || ''}
                            onChange={e => setNewSchool({ ...newSchool, last_code: parseInt(e.target.value) || 0 })}
                        />
                        <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>
                            <Plus size={20} style={{ marginRight: '0.5rem' }} />
                            Add School
                        </button>
                    </form>
                </div>
            )}

            {/* Schools List */}
            <div className="card">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Existing Schools</h3>

                {loading ? (
                    <div className="animate-pulse">Loading schools...</div>
                ) : schools.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No schools found in the "schools" table.
                        <div style={{ marginTop: '1rem', fontSize: '0.875rem', background: '#fef3c7', color: '#92400e', padding: '0.5rem', borderRadius: '4px' }}>
                            ⚠️ Ensure you have created the "schools" table in Supabase.
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {schools.map(school => (
                            <div key={school.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1rem',
                                background: 'var(--surface-hover)',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border)'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{school.name}</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'monospace', display: 'flex', gap: '1rem' }}>
                                        <span>Code: {school.code}</span>
                                        <span>Last Seq: {school.last_code || 0}</span>
                                    </div>
                                </div>
                                {userRole === 'ADMIN' && (
                                    <button
                                        onClick={() => handleDeleteSchool(school.id)}
                                        style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}
                                        title="Delete School"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <hr style={{ margin: '3rem 0', border: '0', borderTop: '1px solid var(--border)' }} />

            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                < BookOpen /> Manage Courses
            </h2>

            {/* Add Course Form - ADMIN ONLY */}
            {userRole === 'ADMIN' && (
                <div className="card mb-8" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Add New Course</h3>
                    <form onSubmit={handleAddCourse} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <select
                            className="input"
                            value={newCourse.school_name}
                            onChange={e => setNewCourse({ ...newCourse, school_name: e.target.value })}
                            required
                            style={{ padding: '0.5rem' }}
                        >
                            <option value="">Select School</option>
                            {schools.map(school => (
                                <option key={school.id} value={school.name}>
                                    {school.name}
                                </option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder="Course Name (e.g. Applied AI)"
                            className="input"
                            value={newCourse.name}
                            onChange={e => setNewCourse({ ...newCourse, name: e.target.value })}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Code (e.g. AA)"
                            className="input"
                            value={newCourse.code}
                            onChange={e => setNewCourse({ ...newCourse, code: e.target.value.toUpperCase() })}
                            required
                            maxLength={5}
                        />
                        <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>
                            <Plus size={20} style={{ marginRight: '0.5rem' }} />
                            Add Course
                        </button>
                    </form>
                </div>
            )}

            {/* Courses List */}
            <div className="card">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Existing Courses</h3>

                {courses.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No courses found.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {courses.map(course => (
                            <div key={course.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1rem',
                                background: 'var(--surface-hover)',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border)'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{course.name}</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        School: {course.school_name} | Code: {course.code}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    {userRole === 'ADMIN' && (
                                        <button
                                            onClick={() => setEditingCourse(course)}
                                            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                                            title="Edit Course"
                                        >
                                            Edit
                                        </button>
                                    )}
                                    {userRole === 'ADMIN' && (
                                        <button
                                            onClick={() => handleDeleteCourse(course.id)}
                                            style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}
                                            title="Delete Course"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Course Modal */}
            {editingCourse && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ width: '90%', maxWidth: '500px' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Edit Course</h3>
                        <form onSubmit={handleUpdateCourse} style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label className="label">School</label>
                                <select
                                    className="input"
                                    value={editingCourse.school_name}
                                    onChange={e => setEditingCourse({ ...editingCourse, school_name: e.target.value })}
                                    required
                                >
                                    {schools.map(school => (
                                        <option key={school.id} value={school.name}>
                                            {school.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Course Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={editingCourse.name}
                                    onChange={e => setEditingCourse({ ...editingCourse, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Course Code</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={editingCourse.code}
                                    onChange={e => setEditingCourse({ ...editingCourse, code: e.target.value.toUpperCase() })}
                                    required
                                    maxLength={5}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                    Save Changes
                                </button>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingCourse(null)}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

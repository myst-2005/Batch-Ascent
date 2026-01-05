import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const json = await request.json()
        const {
            student_name,
            student_email,
            student_phone,
            batch_id,
            sales_user_id
        } = json

        console.log('DEBUG: link-student payload:', {
            student_name,
            student_email,
            student_phone,
            batch_id,
            sales_user_id
        })

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !serviceRoleKey || !anonKey) {
            return NextResponse.json({ error: 'Server configuration error: Missing Supabase keys' }, { status: 500 })
        }

        // 1. Verify Authentication
        const authHeader = request.headers.get('Authorization')
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
        }

        const token = authHeader.replace('Bearer ', '')
        const supabase = createClient(supabaseUrl, anonKey)
        const { data: { user }, error: userError } = await supabase.auth.getUser(token)

        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }

        // 2. Initialize Admin Client
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        // 3. Verify User Role
        const { data: userData, error: roleError } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (roleError || !['ADMIN', 'SHO', 'SSHO', 'ACADEMIC_LEAD'].includes(userData?.role || '')) {
            return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
        }

        // 4. Verify Sales User Exists
        const { data: salesPerson, error: salesPersonError } = await supabaseAdmin
            .from('users')
            .select('id, sales_id')
            .eq('id', sales_user_id)
            .single()

        if (salesPersonError || !salesPerson) {
            console.error('DEBUG: Sales Person Not Found:', sales_user_id, salesPersonError)
            return NextResponse.json({ error: 'Selected Sales Executive not found in database' }, { status: 400 })
        }

        // 5. Fetch Batch Details for Code Generation
        const { data: batch, error: batchFetchError } = await supabaseAdmin
            .from('batches')
            .select('school, course')
            .eq('id', batch_id)
            .single()

        if (batchFetchError || !batch) {
            return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
        }

        const now = new Date().toISOString()
        const phoneInt = parseInt(student_phone.replace(/\D/g, ''))

        // --- Student ID Generation Logic ---

        // Mappings
        const schoolCodes: Record<string, string> = {
            "Tech School": "TS",
            "Design School": "DS",
            "Marketing School": "MS",
            "Finance School": "FS"
        }

        const courseCodes: Record<string, string> = {
            "Applied AI": "AA",
            "N8N": "NN",
            "Data Analytics": "DA",
            "Python": "PY",
            "Branding": "BR",
            "UI/UX": "UX",
            "Graphic Design": "GD",
            "Video Editing": "VE",
            "Social Media Mastery": "SM",
            "Performance Marketing": "PM",
            "Digital Marketing": "DM",
            "Advanced Practical Accounting and Financial Intelligence": "AF",
            "Advanced Taxation Course": "TX",
            "HACA Scale Up": "SU",
            "Tax Practitioner Bootcamp": "TB",
            "NAME": "GEN"
        }

        const schoolCode = schoolCodes[batch.school] || "XX"
        const courseCode = courseCodes[batch.course] || "YY"

        // Get Sequence Number via RPC
        const { data: rpcData, error: rpcError } = await supabaseAdmin
            .rpc('increment_school_counter_sd', { p_school_code: schoolCode })

        if (rpcError) {
            throw new Error('Failed to generate student ID sequence: ' + rpcError.message)
        }

        console.log('DEBUG: RPC Response:', rpcData)

        let seq = rpcData
        // Handle object return (e.g., { seq: 123 }) which causes [object Object]
        if (typeof rpcData === 'object' && rpcData !== null) {
            if ('seq' in rpcData) {
                // @ts-ignore
                seq = rpcData.seq
            } else if (Array.isArray(rpcData) && rpcData.length > 0) {
                // Handle array return if logic changes to setof
                // @ts-ignore
                seq = rpcData[0].seq || rpcData[0]
            }
        }

        // Pad sequence to 4 digits (e.g., 0005)
        const paddedSeq = String(seq).padStart(4, "0")
        const newStudentId = `${schoolCode}${courseCode}${paddedSeq}`

        console.log(`Generated Student ID: ${newStudentId} for ${batch.school} - ${batch.course}`)

        // 5. Database Insertions

        // A. Insert/Get Student
        const { data: studentData, error: studentError } = await supabaseAdmin
            .from('students')
            .insert([
                {
                    student_id: newStudentId, // The generated ID
                    full_name: student_name,
                    email: student_email,
                    phone: isNaN(phoneInt) ? null : phoneInt,
                    batch_id: batch_id,
                    school_code: schoolCode,
                    course_code: courseCode
                }
            ])
            .select()
            .single()

        if (studentError) {
            if (!studentError.message.includes('duplicate') && !studentError.message.includes('unique')) {
                throw new Error('Error creating student: ' + studentError.message)
            }
            console.log('Student presumably already exists, proceeding...')
        }

        // B. Enroll in Batch
        const { error: batchError } = await supabaseAdmin
            .from('student_batches')
            .insert([
                {
                    student_name: student_name,
                    student_email: student_email,
                    student_phone: student_phone,
                    batch_id: batch_id,
                    sales_id: salesPerson.sales_id, // STRICTLY using Sales ID string from users table
                    linked_at: now,
                    onboarding_completed: true,
                    verified_at: now,
                    called_at: now,
                    status: 'Verified'
                }
            ])

        if (batchError) {
            throw new Error('Error linking student to batch: ' + batchError.message)
        }

        // C. Update Sales Stats
        if (salesPerson.sales_id) {
            const { error: salesEnrollError } = await supabaseAdmin
                .from('sales_enrollments')
                .insert({
                    student_email: student_email,
                    student_name: student_name,
                    student_phone: student_phone,
                    batch_id: batch_id,
                    sales_id: salesPerson.sales_id
                })

            if (salesEnrollError) console.error('Sales enrollment stat error:', salesEnrollError)
        }

        return NextResponse.json({
            success: true,
            student: studentData || { status: 'Existing student linked', student_id: newStudentId },
            generated_id: newStudentId
        })

    } catch (error: any) {
        console.error('Link student error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

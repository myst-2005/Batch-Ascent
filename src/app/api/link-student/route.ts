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

        const now = new Date().toISOString()
        const phoneInt = parseInt(student_phone.replace(/\D/g, ''))

        // 5. Database Insertions

        // A. Insert/Get Student
        const { data: studentData, error: studentError } = await supabaseAdmin
            .from('students')
            .insert([
                {
                    full_name: student_name,
                    email: student_email,
                    phone: isNaN(phoneInt) ? null : phoneInt,
                    batch_id: batch_id
                }
            ])
            .select()
            .single()

        if (studentError) {
            // Ignore duplicate errors, otherwise throw
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
                    sales_id: salesPerson.sales_id || salesPerson.id, // Prefer readable Sales ID, fallback to UUID if missing
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
            student: studentData || { status: 'Existing student linked' }
        })

    } catch (error: any) {
        console.error('Link student error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

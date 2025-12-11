import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { student_name, student_email, student_phone, batch_id, sales_id } = body

        // Validate required fields
        if (!student_email || !batch_id || !sales_id) {
            return NextResponse.json({
                error: 'Student email, Batch ID, and Sales ID are required'
            }, { status: 400 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // 1. Verify sales_id exists
        const { data: salesPerson, error: salesError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('sales_id', sales_id)
            .eq('role', 'SALES')
            .single()

        if (salesError || !salesPerson) {
            return NextResponse.json({
                error: 'Invalid Sales ID'
            }, { status: 400 })
        }

        // 2. Verify batch exists and get its capacity
        const { data: batch, error: batchError } = await supabaseAdmin
            .from('batches')
            .select('strength')
            .eq('id', batch_id)
            .single()

        if (batchError || !batch) {
            return NextResponse.json({
                error: 'Batch not found'
            }, { status: 404 })
        }

        // 3. Check current enrollment count
        const { count, error: countError } = await supabaseAdmin
            .from('student_batches')
            .select('*', { count: 'exact', head: true })
            .eq('batch_id', batch_id)

        if (countError) {
            return NextResponse.json({
                error: 'Failed to check batch capacity'
            }, { status: 500 })
        }

        if (count !== null && count >= batch.strength) {
            return NextResponse.json({
                error: 'Batch is full'
            }, { status: 400 })
        }

        // 4. Insert into student_batches
        const { error: enrollError } = await supabaseAdmin
            .from('student_batches')
            .insert({
                student_email,
                student_name,
                student_phone,
                batch_id
            })

        if (enrollError) {
            return NextResponse.json({
                error: 'Failed to enroll student: ' + enrollError.message
            }, { status: 500 })
        }

        // 5. Record in sales_enrollments
        const { error: salesEnrollError } = await supabaseAdmin
            .from('sales_enrollments')
            .insert({
                student_email,
                student_name,
                student_phone,
                batch_id,
                sales_id
            })

        if (salesEnrollError) {
            console.error('Failed to record sales enrollment:', salesEnrollError)
            // Don't fail the request, enrollment was successful
        }

        return NextResponse.json({
            success: true,
            message: 'Student enrolled successfully',
            sales_person: salesPerson.name
        })

    } catch (error: any) {
        console.error('Sales enrollment webhook error:', error)
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 })
    }
}

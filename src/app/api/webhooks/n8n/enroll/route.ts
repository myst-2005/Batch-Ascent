import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, email, phone, batch_id } = body

        if (!email || !batch_id) {
            return NextResponse.json({ error: 'Email and Batch ID are required' }, { status: 400 })
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

        // Check if batch exists
        const { data: batch, error: batchError } = await supabaseAdmin
            .from('batches')
            .select('id, strength')
            .eq('id', batch_id)
            .single()

        if (batchError || !batch) {
            return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
        }

        // Check current enrollment count
        const { count, error: countError } = await supabaseAdmin
            .from('student_batches')
            .select('*', { count: 'exact', head: true })
            .eq('batch_id', batch_id)

        if (count !== null && batch.strength && count >= batch.strength) {
            return NextResponse.json({ error: 'Batch is full' }, { status: 400 })
        }

        // Insert student
        const { data, error } = await supabaseAdmin
            .from('student_batches')
            .insert({
                student_name: name,
                student_email: email,
                student_phone: phone,
                batch_id: batch_id
            })
            .select()
            .single()

        if (error) {
            console.error('Enrollment error:', error)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ success: true, data })

    } catch (error: any) {
        console.error('Webhook error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

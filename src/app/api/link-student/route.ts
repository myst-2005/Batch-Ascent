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

        if (roleError || !['ADMIN', 'CEO', 'SHO', 'SSHO', 'ACADEMIC_LEAD', 'SALES_HEAD'].includes(userData?.role || '')) {
            return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
        }

        const isAdmin = ['ADMIN', 'CEO'].includes(userData?.role || '')

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

        // 5. Fetch Batch Details for Code Generation AND Capacity Check
        const { data: batch, error: batchFetchError } = await supabaseAdmin
            .from('batches')
            .select('school, course, strength, name') // Added strength and name
            .eq('id', batch_id)
            .single()

        if (batchFetchError || !batch) {
            return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
        }

        // --- BATCH CAPACITY CHECK (skipped for ADMIN/CEO) ---
        const { count: enrolledCount } = await supabaseAdmin
            .from('sales_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('batch_id', batch_id)

        if (!isAdmin && enrolledCount !== null && batch.strength && enrolledCount >= batch.strength) {
            console.log(`Batch ${batch.name} (${batch_id}) is FULL. Triggering Overflow Webhook...`)

            // Fetch Sales Person details (need email/phone for webhook if possible, though we only queried ID initially)
            // Let's re-query to be safe and get cleaner data
            const { data: salesUserFull } = await supabaseAdmin
                .from('users')
                .select('email, phone, sales_id')
                .eq('id', sales_user_id)
                .single()

            const payload = {
                sales_id: salesPerson.sales_id,
                sales_email: salesUserFull?.email,
                student_name,
                student_email,
                student_phone,
                batch_name: batch.name,
                batch_id: batch_id,
                school: batch.school,
                course: batch.course,
                status: 'BATCH_FULL_OVERFLOW'
            }

            try {
                // Webhook URL provided by user
                const response = await fetch('https://purpletech.app.n8n.cloud/webhook/fafed605-b9af-4f2c-92b5-082b14770997', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })

                if (!response.ok) {
                    console.error('Webhook failed with status:', response.status)
                }
            } catch (err) {
                console.error('Webhook fetch error:', err)
            }

            // Return a specific status so frontend can show "Batch Full, Request Queued"
            // We do NOT insert into DB. "Delete that data" means don't save it locally.
            return NextResponse.json({
                success: false,
                error: `Batch is full (${enrolledCount}/${batch.strength} students). Student has been added to the waitlist.`,
                code: 'BATCH_FULL'
            }, { status: 409 })
        }

        const now = new Date().toISOString()

        // --- Student ID Generation Logic ---

        // Fetch School Code from DB
        const { data: schoolData, error: schoolFetchError } = await supabaseAdmin
            .from('schools')
            .select('code')
            .eq('name', batch.school)
            .single()

        let schoolCode = "XX"
        if (schoolData && schoolData.code) {
            schoolCode = schoolData.code
        } else {
            console.warn(`School code for '${batch.school}' not found in DB, defaulting to XX`)
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
            "Flutter full stack": "FL",
            "NAME": "GEN"
        }

        // Use the schoolCode we fetched from the DB above.
        // If it was missing, we already defaulted it to "XX".

        const courseCode = courseCodes[batch.course] || "YY"

        // Get Sequence Number via RPC
        const { data: rpcData, error: rpcError } = await supabaseAdmin
            .rpc('increment_school_counter_sd', { p_school_code: schoolCode })

        if (rpcError) {
            console.error('Student ID generation failed (non-fatal):', rpcError.message)
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

        // 5. Insert into sales_enrollments (primary table used by batch detail page)
        const { error: enrollError } = await supabaseAdmin
            .from('sales_enrollments')
            .insert({
                student_name,
                student_email,
                student_phone,
                batch_id,
                sales_id: salesPerson.sales_id,
                status: 'Pending',
                onboarding_completed: false,
                linked_at: now
            })

        if (enrollError) {
            throw new Error('Error enrolling student: ' + enrollError.message)
        }

        return NextResponse.json({
            success: true,
            generated_id: newStudentId
        })

    } catch (error: any) {
        console.error('Link student error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

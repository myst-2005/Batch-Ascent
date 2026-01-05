import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { id, cliq_id, role, school, sales_id } = await request.json()

        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !serviceRoleKey || !anonKey) {
            console.error('Missing Supabase Environment Variables', {
                url: !!supabaseUrl,
                serviceRole: !!serviceRoleKey,
                anon: !!anonKey
            })
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // 0. Verify Auth
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

        // Initialize Admin Client
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

        // Check Permissions
        const { data: userData, error: roleError } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (roleError || (userData?.role !== 'ADMIN' && userData?.role !== 'SUB_ADMIN')) {
            return NextResponse.json({ error: 'Forbidden: Admin/SubAdmin only' }, { status: 403 })
        }

        const updateData: any = {}
        if (cliq_id !== undefined) updateData.cliq_id = cliq_id
        if (role !== undefined) updateData.role = role
        if (school !== undefined) updateData.school = school
        if (sales_id !== undefined) updateData.sales_id = sales_id

        const { error } = await supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Update user error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

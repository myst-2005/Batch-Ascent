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
        if (cliq_id !== undefined) updateData.cliq_id = cliq_id || null
        if (role !== undefined) updateData.role = role
        if (school !== undefined) updateData.school = school || null
        if (sales_id !== undefined) updateData.sales_id = sales_id || null

        // Validation: Check if Academic Lead already exists for this school
        if (role === 'ACADEMIC_LEAD' && (school || updateData.school)) {
            const targetSchool = school || updateData.school

            const { data: existingLead } = await supabaseAdmin
                .from('users')
                .select('id, name')
                .eq('role', 'ACADEMIC_LEAD')
                .eq('school', targetSchool)
                .neq('id', id)
                .maybeSingle()

            if (existingLead) {
                if (userData?.role === 'ADMIN') {
                    // ADMIN can override — demote the existing Academic Lead to SHO
                    await supabaseAdmin
                        .from('users')
                        .update({ role: 'SHO' })
                        .eq('id', existingLead.id)
                } else {
                    // SUB_ADMIN cannot override
                    return NextResponse.json({ error: `There is already an Academic Lead for ${targetSchool} (${existingLead.name}). Please change their role first.` }, { status: 400 })
                }
            }
        }

        // Update auth.users metadata FIRST so any BEFORE UPDATE trigger
        // on public.users reads the new values instead of the old ones
        const authMeta: any = {}
        if (role !== undefined) authMeta.role = role
        if (school !== undefined) authMeta.school = school || null
        if (Object.keys(authMeta).length > 0) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
                user_metadata: authMeta,
                app_metadata: authMeta
            })
            if (authError) console.error('Auth metadata update error (non-fatal):', authError.message)
        }

        // Now update public.users — any trigger will see the fresh auth metadata
        const { data: updated, error } = await supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select('id, role')

        if (error) throw error

        if (!updated || updated.length === 0) {
            throw new Error(`Update matched 0 rows for user id: ${id}. Check if the ID exists in the users table.`)
        }

        return NextResponse.json({ success: true, updated: updated[0] })

    } catch (error: any) {
        console.error('Update user error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

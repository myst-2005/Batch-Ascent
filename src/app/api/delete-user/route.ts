import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { id } = await request.json()

        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !serviceRoleKey || !anonKey) {
            console.error('Missing Supabase Environment Variables (delete info)', {
                url: !!supabaseUrl,
                serviceRole: !!serviceRoleKey,
                anon: !!anonKey
            })
            return NextResponse.json({ error: 'Server configuration error: Missing Supabase keys' }, { status: 500 })
        }

        // 0. Verify the requester is an Admin
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

        const supabaseAdmin = createClient(
            supabaseUrl,
            serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Check if user is admin or sub_admin
        const { data: userData, error: roleError } = await supabaseAdmin
            .from('users')
            .select('role, name, email')
            .eq('id', user.id)
            .single()

        if (roleError || (userData?.role !== 'ADMIN' && userData?.role !== 'SUB_ADMIN')) {
            console.log("DEBUG: Permission Denied. User ID:", user.id);
            console.log("DEBUG: Role Error:", roleError);
            console.log("DEBUG: User Role Data:", userData);
            return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 })
        }

        // Fetch target user info before deleting
        const { data: targetUser } = await supabaseAdmin
            .from('users')
            .select('email, name, role')
            .eq('id', id)
            .single()

        // 1. Delete from Auth Users (This is the critical part)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        // 2. Delete from Public Users (Optional if you have cascade delete, but good to be explicit)
        const { error: dbError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', id)

        if (dbError) {
            return NextResponse.json({ error: dbError.message }, { status: 400 })
        }

        // Log the delete action
        const deleteIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'Unknown'
        const deleteUserAgent = request.headers.get('user-agent') || 'Unknown'
        await supabaseAdmin.from('activity_logs').insert({
            user_id: user.id,
            user_name: userData?.name || user.email,
            user_email: userData?.email || user.email,
            user_role: userData?.role,
            action: 'USER_DELETE',
            details: { deleted_user_id: id, deleted_email: targetUser?.email || null, deleted_role: targetUser?.role || null },
            ip_address: deleteIp,
            user_agent: deleteUserAgent
        })

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Delete error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

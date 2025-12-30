import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { email, role, school, name } = await request.json()

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        // DEBUGGING: Log environment variable details
        console.log('DEBUG: Checking Supabase Config')
        console.log('DEBUG: URL:', supabaseUrl)
        console.log('DEBUG: Service Role Key Length:', serviceRoleKey?.length)
        console.log('DEBUG: Service Role Key Start:', serviceRoleKey?.substring(0, 5))
        console.log('DEBUG: Service Role Key End:', serviceRoleKey?.substring(serviceRoleKey.length - 5))
        console.log('DEBUG: Is Valid Service Role Key (simple check):', serviceRoleKey?.startsWith('eyJ'))

        if (!supabaseUrl || !serviceRoleKey || !anonKey) {
            console.error('Missing Supabase Environment Variables', {
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

        // Check if user is admin
        const { data: userData, error: roleError } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (roleError || userData?.role !== 'ADMIN') {
            console.log("DEBUG INVITE: Permission Denied. User ID:", user.id);
            console.log("DEBUG INVITE: Role Error:", roleError);
            console.log("DEBUG INVITE: User Role Data:", userData);
            return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 })
        }

        // Determine App URL (fallback to origin if env var is missing)
        let appUrl = process.env.NEXT_PUBLIC_APP_URL
        if (!appUrl) {
            appUrl = request.headers.get('origin') || 'http://localhost:3000'
        }
        console.log('DEBUG: Using App URL:', appUrl)

        // 1. Invite the user via Supabase Auth
        console.log('DEBUG: Attempting to invite user:', email)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
                role,
                school,
                name
            },
            redirectTo: `${appUrl}/auth/callback`
        })

        if (authError) {
            // Handle case where user already exists
            if (authError.message.includes('already been registered')) {
                const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
                const existingUser = users.find(u => u.email === email)

                if (existingUser) {
                    const { error: dbError } = await supabaseAdmin
                        .from('users')
                        .upsert({
                            id: existingUser.id,
                            email: email,
                            name: name,
                            role: 'PENDING',
                            requested_role: role,
                            school: school,

                        })

                    if (dbError) {
                        console.error('Error syncing existing user:', dbError)
                        return NextResponse.json({ error: 'Failed to update existing user record' }, { status: 500 })
                    }

                    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
                        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
                    })

                    if (resetError) {
                        return NextResponse.json({ error: 'User exists but failed to send reset email: ' + resetError.message }, { status: 400 })
                    }

                    return NextResponse.json({ success: true, message: "User already existed. Re-linked and sent password reset email." })
                }
            }

            console.error('Invite failed (Auth):', authError)
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        // 2. Insert into public.users table
        const { error: dbError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: authData.user.id,
                email: email,
                name: name,
                role: 'PENDING',
                requested_role: role,
                school: school,

            })

        if (dbError) {
            console.error('Error syncing to public users:', dbError)
        }

        return NextResponse.json({ success: true, user: authData.user })

    } catch (error: any) {
        console.error('Invite error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

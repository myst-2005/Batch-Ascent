import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { email, role, school, name } = await request.json()

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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

        // 1. Invite the user via Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
                role,
                school,
                name
            },
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
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
                            role: role,
                            school: school,
                            password: 'MANAGED_BY_SUPABASE_AUTH'
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

            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        // 2. Insert into public.users table
        const { error: dbError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: authData.user.id,
                email: email,
                name: name,
                role: role,
                school: school,
                password: 'MANAGED_BY_SUPABASE_AUTH'
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

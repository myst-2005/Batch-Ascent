import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { userId } = await request.json()

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !serviceRoleKey || !anonKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // 1. Verify Requester
        const authHeader = request.headers.get('Authorization')
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
        }
        const token = authHeader.replace('Bearer ', '')
        const supabase = createClient(supabaseUrl, anonKey)
        const { data: { user: requester }, error: userError } = await supabase.auth.getUser(token)

        if (userError || !requester) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }

        // 2. Setup Admin Client
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        // 3. Check Role (Only ADMIN and CEO)
        const { data: userData, error: roleError } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', requester.id)
            .single()

        if (roleError || (userData?.role !== 'ADMIN' && userData?.role !== 'CEO')) {
            return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 })
        }

        // 4. Get Target User Email
        const { data: targetUser, error: targetError } = await supabaseAdmin.auth.admin.getUserById(userId)

        if (targetError || !targetUser.user) {
            return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
        }

        const email = targetUser.user.email
        if (!email) {
            return NextResponse.json({ error: 'Target user has no email' }, { status: 400 })
        }

        // 5. Generate Magic Link
        const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
        })

        if (linkError) {
            return NextResponse.json({ error: linkError.message }, { status: 500 })
        }

        // 6. Return the action link
        // In v2, data.properties contains the action_link
        const actionLink = data.properties?.action_link

        if (!actionLink) {
            return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 })
        }

        return NextResponse.json({ url: actionLink })

    } catch (error: any) {
        console.error('Impersonate error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

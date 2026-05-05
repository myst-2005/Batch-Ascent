import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { user_id, user_name, user_email, user_role, action, details } = await request.json()

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const ip =
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            'Unknown'

        const userAgent = request.headers.get('user-agent') || 'Unknown'

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        const { error } = await supabaseAdmin.from('activity_logs').insert({
            user_id: user_id || null,
            user_name: user_name || '',
            user_email: user_email || '',
            user_role: user_role || '',
            action,
            details: details || {},
            ip_address: ip,
            user_agent: userAgent
        })

        if (error) {
            console.error('Activity log insert error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Log activity error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

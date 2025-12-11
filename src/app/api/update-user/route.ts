import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { id, cliq_id } = await request.json()

        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        // Fallback to hardcoded values if env vars not available
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jawimglodnhhidvvpgar.supabase.co'
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphd2ltZ2xvZG5oaGlkdnZwZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM4NzI2MywiZXhwIjoyMDgwOTYzMjYzfQ.7J_J6OY8EJKMHPJnlxRIOJQHEHIN52txYGjwbH0Ei-U'

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

        const { error } = await supabaseAdmin
            .from('users')
            .update({ cliq_id: cliq_id })
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Update user error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

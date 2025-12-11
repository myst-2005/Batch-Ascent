import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { id } = await request.json()

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

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Delete error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

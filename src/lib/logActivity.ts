import { supabase } from '@/lib/supabaseClient'

export async function logActivity(params: {
    action: string
    details?: Record<string, any>
}) {
    try {
        const user_name = typeof window !== 'undefined' ? localStorage.getItem('userName') || '' : ''
        const user_role = typeof window !== 'undefined' ? localStorage.getItem('userRole') || '' : ''

        // Get user_id and email from active session
        const { data: { session } } = await supabase.auth.getSession()
        const user_id = session?.user?.id || null
        const user_email = session?.user?.email || ''

        await fetch('/api/log-activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id,
                user_name,
                user_email,
                user_role,
                action: params.action,
                details: params.details || {}
            })
        })
    } catch {
        // fire and forget — never block the main flow
    }
}

export async function logActivity(params: {
    action: string
    details?: Record<string, any>
}) {
    try {
        const user_name = typeof window !== 'undefined' ? localStorage.getItem('userName') || '' : ''
        const user_role = typeof window !== 'undefined' ? localStorage.getItem('userRole') || '' : ''

        await fetch('/api/log-activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_name,
                user_role,
                action: params.action,
                details: params.details || {}
            })
        })
    } catch {
        // fire and forget — never block the main flow
    }
}

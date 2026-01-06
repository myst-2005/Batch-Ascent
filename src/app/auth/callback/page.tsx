'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallbackPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Check for errors in the URL fragment (hash)
        if (typeof window !== 'undefined' && window.location.hash) {
            const params = new URLSearchParams(window.location.hash.substring(1)) // remove the #
            const errorDescription = params.get('error_description')

            if (errorDescription) {
                setError(errorDescription.replace(/\+/g, ' '))
                return
            }
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                // User is now signed in (via the link)
                // Redirect them to set their password
                router.push('/update-password')
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [router])

    if (error) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'var(--background)',
                color: 'var(--foreground)',
                flexDirection: 'column',
                gap: '1rem',
                textAlign: 'center',
                padding: '2rem'
            }}>
                <div style={{ color: 'var(--error)', fontSize: '1.25rem', fontWeight: 'bold' }}>Link Expired or Invalid</div>
                <div>{error}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Please ask the admin to invite you again.</div>
                <button onClick={() => router.push('/')} className="btn btn-primary" style={{ marginTop: '1rem' }}>Go to Login</button>
            </div>
        )
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'var(--background)',
            color: 'var(--foreground)'
        }}>
            <div className="animate-pulse">Verifying your account...</div>
        </div>
    )
}

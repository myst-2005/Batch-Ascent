import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Verifies the 6-digit code and, if valid, sets the new password using the
// service-role admin API. No Supabase auth email/token is involved.

const MAX_ATTEMPTS = 5

function hashCode(email: string, code: string) {
    return crypto.createHash('sha256').update(`${email.toLowerCase()}:${code}`).digest('hex')
}

export async function POST(request: Request) {
    try {
        const { email, code, password } = await request.json()

        if (!email || !code || !password) {
            return NextResponse.json({ error: 'Email, code and new password are required' }, { status: 400 })
        }
        if (typeof password !== 'string' || password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
        }

        const normalizedEmail = String(email).trim().toLowerCase()
        const normalizedCode = String(code).trim()

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Server configuration error: Supabase keys missing' }, { status: 500 })
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        // Get the latest active code for this email.
        const { data: otpRow, error: fetchError } = await supabaseAdmin
            .from('password_reset_otps')
            .select('*')
            .eq('email', normalizedEmail)
            .eq('used', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (fetchError) {
            console.error('OTP fetch error:', fetchError)
            return NextResponse.json({ error: 'Could not verify the code' }, { status: 500 })
        }

        if (!otpRow) {
            return NextResponse.json({ error: 'No active reset code. Please request a new one.' }, { status: 400 })
        }

        if (new Date(otpRow.expires_at).getTime() < Date.now()) {
            await supabaseAdmin.from('password_reset_otps').update({ used: true }).eq('id', otpRow.id)
            return NextResponse.json({ error: 'This code has expired. Please request a new one.' }, { status: 400 })
        }

        if (otpRow.attempts >= MAX_ATTEMPTS) {
            await supabaseAdmin.from('password_reset_otps').update({ used: true }).eq('id', otpRow.id)
            return NextResponse.json({ error: 'Too many attempts. Please request a new code.' }, { status: 429 })
        }

        const providedHash = hashCode(normalizedEmail, normalizedCode)
        if (providedHash !== otpRow.code_hash) {
            await supabaseAdmin
                .from('password_reset_otps')
                .update({ attempts: otpRow.attempts + 1 })
                .eq('id', otpRow.id)
            return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 })
        }

        // Code is valid — find the auth user (users.id === auth user id) and set the password.
        const { data: userRow, error: userError } = await supabaseAdmin
            .from('users')
            .select('id')
            .ilike('email', normalizedEmail)
            .maybeSingle()

        if (userError || !userRow) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 })
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userRow.id, { password })
        if (updateError) {
            console.error('Password update error:', updateError)
            return NextResponse.json({ error: 'Could not update the password: ' + updateError.message }, { status: 500 })
        }

        // Burn the code so it can't be reused.
        await supabaseAdmin.from('password_reset_otps').update({ used: true }).eq('id', otpRow.id)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('verify-reset-otp error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import crypto from 'crypto'

// Generates a 6-digit code, stores its hash, and emails it via Resend.
// This fully bypasses Supabase's auth email templates.

const OTP_TTL_MINUTES = 15

function hashCode(email: string, code: string) {
    return crypto.createHash('sha256').update(`${email.toLowerCase()}:${code}`).digest('hex')
}

export async function POST(request: Request) {
    try {
        const { email } = await request.json()
        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }
        const normalizedEmail = email.trim().toLowerCase()

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const resendApiKey = process.env.RESEND_API_KEY
        const fromAddress = process.env.RESEND_FROM || 'Haris & Co Academy <noreply@harisandcoacademy.com>'

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Server configuration error: Supabase keys missing' }, { status: 500 })
        }
        if (!resendApiKey) {
            return NextResponse.json({ error: 'Server configuration error: RESEND_API_KEY missing' }, { status: 500 })
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        // Only send if the account actually exists (but never reveal that to the caller).
        const { data: userRow } = await supabaseAdmin
            .from('users')
            .select('id, email')
            .ilike('email', normalizedEmail)
            .maybeSingle()

        // Always respond success so we don't leak which emails are registered.
        const genericOk = NextResponse.json({ success: true })

        if (!userRow) {
            return genericOk
        }

        // Generate the code and store only its hash.
        const code = String(crypto.randomInt(100000, 1000000)) // 6 digits
        const codeHash = hashCode(normalizedEmail, code)
        const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString()

        // Invalidate any previous unused codes for this email.
        await supabaseAdmin
            .from('password_reset_otps')
            .update({ used: true })
            .eq('email', normalizedEmail)
            .eq('used', false)

        const { error: insertError } = await supabaseAdmin
            .from('password_reset_otps')
            .insert({ email: normalizedEmail, code_hash: codeHash, expires_at: expiresAt })

        if (insertError) {
            console.error('OTP insert error:', insertError)
            return NextResponse.json(
                { error: 'Could not create reset code', details: insertError.message, code: insertError.code },
                { status: 500 }
            )
        }

        // Send the code via Resend (our own template — no Supabase dashboard involved).
        const resend = new Resend(resendApiKey)
        const { error: sendError } = await resend.emails.send({
            from: fromAddress,
            to: normalizedEmail,
            subject: `Your password reset code: ${code}`,
            html: `
<div style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:0;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:40px 20px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">Haris &amp; Co Academy</h1>
    </div>
    <div style="padding:40px 30px;text-align:center;color:#374151;">
      <h2 style="color:#111827;font-size:22px;margin-top:0;">Reset Your Password</h2>
      <p style="font-size:16px;color:#4b5563;">Enter this code on the password reset page to continue:</p>
      <div style="display:inline-block;margin:16px auto;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;padding:18px 36px;">
        <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#2563eb;">${code}</span>
      </div>
      <p style="font-size:14px;color:#6b7280;">This code expires in ${OTP_TTL_MINUTES} minutes. Do not share it with anyone.</p>
    </div>
    <div style="padding:24px;text-align:center;font-size:12px;color:#9ca3af;background:#f9fafb;border-top:1px solid #e5e7eb;">
      &copy; 2024 Haris &amp; Co Academy. If you didn't request this, ignore this email.
    </div>
  </div>
</div>`,
        })

        if (sendError) {
            console.error('Resend send error:', sendError)
            return NextResponse.json(
                { error: 'Could not send the reset email', details: (sendError as any).message || String(sendError) },
                { status: 502 }
            )
        }

        return genericOk
    } catch (error: any) {
        console.error('send-reset-otp error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

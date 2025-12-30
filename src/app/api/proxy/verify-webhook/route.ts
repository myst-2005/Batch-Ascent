import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const isProd = process.env.NODE_ENV === 'production'

        const webhookUrl = isProd
            ? 'https://purpletech.app.n8n.cloud/webhook/bcc93a8e-ce14-41e8-ad43-265a66a7ddd7'
            : 'https://purpletech.app.n8n.cloud/webhook-test/bcc93a8e-ce14-41e8-ad43-265a66a7ddd7'

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            throw new Error(`Webhook failed with status ${response.status}`)
        }

        const data = await response.text() // n8n might return text or json
        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        console.error('Proxy Error Full:', error)
        console.error('Proxy Error Message:', error.message)
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
    }
}

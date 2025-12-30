'use server'

export async function triggerVerificationWebhook(payload: any, type: 'verification' | 'update_email' = 'verification') {
    // Force Production URLs to ensure stability
    const baseUrl = 'https://purpletech.app.n8n.cloud/webhook/'

    let webhookId = ''
    if (type === 'verification') {
        webhookId = 'bcc93a8e-ce14-41e8-ad43-265a66a7ddd7'
    } else {
        webhookId = '956a4dff-4798-47ec-9da1-9d761fc3b156'
    }

    const webhookUrl = `${baseUrl}${webhookId}`

    console.log('Server Action: Triggering webhook:', webhookUrl)

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        if (!res.ok) {
            const text = await res.text()
            throw new Error(`Webhook failed: ${res.status} ${text}`)
        }

        const data = await res.json()
        return { success: true, data }
    } catch (error: any) {
        console.error('Webhook error:', error)
        return { success: false, error: error.message }
    }
}

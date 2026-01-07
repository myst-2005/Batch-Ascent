
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugBatches() {
    console.log('Fetching all batch IDs...')
    const { data, error } = await supabase
        .from('batches')
        .select('id, name, school')

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('Found batches:', data.length)
    data.forEach(b => {
        console.log(`[${b.id}] - ${b.name} (${b.school})`)
    })
}

debugBatches()

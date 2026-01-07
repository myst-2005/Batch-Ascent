
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Try to load from .env.local
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing environment variables. URL:', supabaseUrl, 'Key:', !!supabaseAnonKey)
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkBatch() {
    const batchId = 'PMON10'
    console.log(`Checking database for Batch ID: "${batchId}"`)

    const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('id', batchId)
        .maybeSingle()

    if (error) {
        console.error('Supabase Error:', error)
        return
    }

    const fs = require('fs');
    let output = '';
    if (!data) {
        output += '❌ Batch NOT found in database.\n';
        // Let's try to search vaguely
        const { data: allBatches } = await supabase.from('batches').select('id, name').ilike('id', `%PMON%`)
        if (allBatches && allBatches.length > 0) {
            output += 'Did you mean one of these?\n' + JSON.stringify(allBatches, null, 2);
        }
    } else {
        output += '✅ Batch FOUND:\n' + JSON.stringify(data, null, 2);
    }
    console.log(output);
    fs.writeFileSync('pmon10_result.txt', output);
}

checkBatch()

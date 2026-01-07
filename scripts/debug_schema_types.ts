
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function checkBatchesSchema() {
    let out = '';

    out += "Checking batches table schema by querying...\n"

    // 1. Try fetching a row
    const { data, error } = await supabase.from('batches').select('*').limit(1)
    if (data && data.length > 0) {
        out += "Sample batch row: " + JSON.stringify(data[0]) + "\n"
        out += "Type of id: " + typeof data[0].id + "\n"
    } else {
        out += "No batches found or error: " + JSON.stringify(error) + "\n"
    }

    // 2. Try fetching with a UUID-like string
    const uuid = '00000000-0000-0000-0000-000000000000'
    const { error: errorUuid } = await supabase.from('batches').select('*').eq('id', uuid).limit(1)
    if (errorUuid) {
        out += "Querying batches with UUID produced error: " + JSON.stringify(errorUuid) + "\n"
    } else {
        out += "Querying batches with UUID was OK.\n"
    }

    // 3. Try fetching with 'PMON10'
    const { error: errorText } = await supabase.from('batches').select('*').eq('id', 'PMON10').limit(1)
    if (errorText) {
        out += "Querying batches with 'PMON10' produced error: " + JSON.stringify(errorText) + "\n"
    } else {
        out += "Querying batches with 'PMON10' was OK.\n"
    }

    out += "\nChecking sales_enrollments table...\n"
    // 4. Check sales_enrollments
    const { data: seData, error: seError } = await supabase.from('sales_enrollments').select('*').limit(1)
    if (seError) {
        out += "Error querying sales_enrollments: " + JSON.stringify(seError) + "\n"
    } else if (seData && seData.length > 0) {
        out += "Sample sales_enrollments row: " + JSON.stringify(seData[0]) + "\n"
    } else {
        out += "sales_enrollments table exists but is empty.\n"
    }

    console.log(out)
    fs.writeFileSync('schema_debug.txt', out)
}

checkBatchesSchema()

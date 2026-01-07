
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl!, supabaseAnonKey!)

async function checkSchema() {
    const fs = require('fs');
    // console.log('Checking column types...') // Removed initial console.log

    // We can query custom RPC if enabled, or try to infer from error messages usually.
    // But honestly, the best way to "view" schema with limited user is often just trying to insert a dummy or reading error messages.
    // However, we can try to assume standard postgres information_schema access if RLS allows or if using service role (we are using anon key though).

    // Let's try to fetch one row from each and guess type, or force an error that reveals type.

    let out = ''; // Initialize output string

    // Check known potential tables
    const table = 'sales_enrollments';

    out += `\n--- Testing ${table} with Text ID ---\n`
    const { error: textError } = await supabase.from(table).select('*').eq('batch_id', 'PMON10').limit(1)
    if (textError) {
        out += 'Querying with "PMON10" gave error: ' + JSON.stringify(textError) + '\n'
    } else {
        out += 'Querying with "PMON10" succeeded (Column likely TEXT).\n'
    }

    out += `\n--- Testing ${table} with UUID ---\n`
    const { error: uuidError } = await supabase.from(table).select('*').eq('batch_id', '00000000-0000-0000-0000-000000000000').limit(1)
    if (uuidError) {
        out += 'Querying with UUID gave error: ' + JSON.stringify(uuidError) + '\n'
    } else {
        out += 'Querying with UUID succeeded.\n'
    }

    console.log(out) // Log to console as well
    fs.writeFileSync('schema_check_result.txt', out); // Write output to file
}

checkSchema()

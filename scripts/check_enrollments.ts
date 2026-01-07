
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing environment variables.')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkEnrollments() {
    const batchId = 'PMON10'
    const fs = require('fs');
    let out = '';
    out += `Checking 'student_batches' for batch_id: "${batchId}"\n`

    const { data, error } = await supabase
        .from('student_batches')
        .select('*')
        .eq('batch_id', batchId)

    if (error) {
        out += 'Error: ' + JSON.stringify(error) + '\n'
    } else {
        out += `Found ${data.length} records in student_batches for ${batchId}\n`
        if (data.length > 0) out += JSON.stringify(data, null, 2) + '\n'
    }

    // Check case insensitive
    out += `Checking 'student_batches' ILIKE %PMON10%\n`
    const { data: fuzzyData, error: fuzzyError } = await supabase
        .from('student_batches')
        .select('*')
        .ilike('batch_id', '%PMON10%')

    if (fuzzyError) {
        out += 'Fuzzy Error: ' + JSON.stringify(fuzzyError) + '\n'
    } else {
        out += `Found ${fuzzyData.length} records with fuzzy match\n`
        if (fuzzyData.length > 0) out += JSON.stringify(fuzzyData, null, 2) + '\n'
    }

    console.log(out)
    fs.writeFileSync('enrollments_result.txt', out)
}

checkEnrollments()

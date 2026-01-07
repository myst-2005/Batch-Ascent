
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl!, supabaseAnonKey!)

async function listTables() {
    const candidates = ['sales_enrollment', 'enrollments', 'student_batches', 'leads', 'sales_leads', 'sales_enrollments', 'users_enrollment'];

    const fs = require('fs');
    let out = '';
    for (const table of candidates) {
        const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (!error) {
            out += `✅ Table exists: ${table}\n`
        } else {
            if (error.code === '42P01' || error.message?.includes('not found') || error.message?.includes('does not exist')) {
                out += `❌ Table DOES NOT exist: ${table}\n`
            } else {
                out += `⚠️ Table ${table} status: ${error.code} - ${error.message}\n`
            }
        }
    }
    console.log(out);
    fs.writeFileSync('tables_output.txt', out);
}

listTables()

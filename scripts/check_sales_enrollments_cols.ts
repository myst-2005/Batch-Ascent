
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function checkColumns() {
    const fs = require('fs');
    let out = '';

    out += "Checking columns for: sales_enrollments\n";
    // Using a trick: select * limit 0 usually returns headers, but supabase JS returns empty array.
    // Instead, fetch 1 row (even if empty, errors might reveal columns)
    // Or querying pg_attribute via rpc if available.
    // Simplifying: Select a row and look at keys.

    // Better: Try to access columns that we need.
    const neededCols = ['id', 'student_name', 'student_email', 'student_phone', 'batch_id', 'sales_id', 'linked_at', 'verified_at', 'status', 'called_at', 'onboarding_completed'];

    const { data, error } = await supabase
        .from('sales_enrollments')
        .select(neededCols.join(','))
        .limit(1);

    if (error) {
        out += `Error selecting columns: ${error.message}\n`;
        out += `Details: ${JSON.stringify(error)}\n`;
    } else {
        out += "Select successful! The table likely has these columns.\n";
        if (data && data.length > 0) {
            out += "Sample Row: " + JSON.stringify(data[0]) + "\n";
        } else {
            out += "Table is empty, but columns exist.\n";
        }
    }

    console.log(out);
    fs.writeFileSync('sales_enrollments_columns.txt', out);
}

checkColumns();

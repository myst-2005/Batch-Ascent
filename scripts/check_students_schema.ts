
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function checkStudentsSchema() {
    let out = '';

    out += "Checking students table columns...\n"

    // We can't query information_schema easily via JS client, but we can inspect a row or an insert error.
    // Let's try to query 1 row.
    const { data, error } = await supabase.from('students').select('*').limit(1);

    if (data && data.length > 0) {
        out += "Sample row: " + JSON.stringify(data[0]) + "\n";
    } else if (error) {
        out += "Error fetching students: " + JSON.stringify(error) + "\n";
    } else {
        out += "Table empty.\n";
    }

    out += "\nChecking if student_id is mandatory...\n"
    // Try to insert a dummy record WITHOUT student_id to see if it fails (dry run via transaction rollback impossible in HTTP)
    // Actually, I can't easily test constraints without risking pollution.
    // I will look at the provided files `api/link-student/route.ts` which generates ID manually.

    out += "Review of api/link-student suggests student_id IS manual (lines 187-212 generate it).\n"

    console.log(out)
    fs.writeFileSync('students_schema_debug.txt', out)
}

checkStudentsSchema()

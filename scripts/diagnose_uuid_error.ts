
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function diagnoseUuidError() {
    const fs = require('fs');
    let out = '';
    const testId = 'PMON10';
    out += `Diagnosing "invalid input syntax for type uuid" with ID: ${testId}\n\n`;

    const tablesToCheck = ['batches', 'student_batches', 'students', 'sales_enrollments'];
    const columnsToCheck = ['id', 'batch_id'];

    for (const table of tablesToCheck) {
        out += `--- Table: ${table} ---\n`;

        // 1. Try querying 'id' = PMON10
        if (columnsToCheck.includes('id')) {
            try {
                const { error } = await supabase.from(table).select('id').eq('id', testId).limit(1);
                if (error) {
                    out += `Querying 'id'=${testId} FAILED: ${JSON.stringify(error)}\n`;
                } else {
                    out += `Querying 'id'=${testId} SUCCEEDED (Column is likely TEXT).\n`;
                }
            } catch (e: any) {
                out += `Exception querying 'id': ${e.message}\n`;
            }
        }

        // 2. Try querying 'batch_id' = PMON10
        // (Only if checking batches, but batches usually doesn't have batch_id, other tables do)
        if (table !== 'batches') {
            try {
                const { error } = await supabase.from(table).select('*').eq('batch_id', testId).limit(1);
                if (error) {
                    out += `Querying 'batch_id'=${testId} FAILED: ${JSON.stringify(error)}\n`;
                } else {
                    out += `Querying 'batch_id'=${testId} SUCCEEDED (Column is likely TEXT).\n`;
                }
            } catch (e: any) {
                out += `Exception querying 'batch_id': ${e.message}\n`;
            }
        }
        out += '\n';
    }

    console.log(out);
    fs.writeFileSync('uuid_diagnosis_result.txt', out);
}

diagnoseUuidError();

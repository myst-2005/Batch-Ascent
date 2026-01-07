
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function reproPageLoad() {
    const fs = require('fs');
    let out = '';
    const batchId = 'PMON10';
    out += `Reproducing logic for Batch ID: ${batchId}\n\n`;

    // 1. fetchBatchDetails
    out += "1. Fetching Batch Details...\n";
    const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('*')
        .eq('id', batchId)
        .maybeSingle();

    if (batchError) {
        out += `BATCH ERROR: ${JSON.stringify(batchError)}\n`;
    } else {
        out += `Batch found: ${batch ? 'Yes' : 'No'}\n`;
    }

    // 2. fetchStudents
    out += "\n2. Fetching Students (student_batches)...\n";
    const { data: enrollments, error: enrollError } = await supabase
        .from('student_batches')
        .select('*')
        .eq('batch_id', batchId)
        .order('linked_at', { ascending: false });

    if (enrollError) {
        out += `ENROLLMENT ERROR: ${JSON.stringify(enrollError)}\n`;
    } else {
        out += `Enrollments count: ${enrollments?.length || 0}\n`;
    }

    // 3. Process Sales IDs
    if (enrollments && enrollments.length > 0) {
        const rawSalesIds: string[] = enrollments?.map((e: any) => e.sales_id).filter(Boolean) || []
        const salesIds = Array.from(new Set(rawSalesIds))
        out += `\nUnique Sales IDs found: ${JSON.stringify(salesIds)}\n`;

        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        const uuidSalesIds = salesIds.filter(id => uuidPattern.test(id))
        const stringSalesIds = salesIds.filter(id => !uuidPattern.test(id))

        out += `UUIDs: ${JSON.stringify(uuidSalesIds)}\n`;
        out += `Strings: ${JSON.stringify(stringSalesIds)}\n`;

        // 3a. Query by ID (UUID)
        if (uuidSalesIds.length > 0) {
            out += "Querying users by ID (UUID)...\n";
            const { error: uErr } = await supabase
                .from('users')
                .select('id, name, phone, sales_id')
                .in('id', uuidSalesIds);
            if (uErr) out += `USERS (UUID) ERROR: ${JSON.stringify(uErr)}\n`;
            else out += "Users (UUID) fetch OK.\n";
        }

        // 3b. Query by Sales ID (String)
        if (stringSalesIds.length > 0) {
            out += "Querying users by Sales ID (String)...\n";
            const { error: sErr } = await supabase
                .from('users')
                .select('id, name, phone, sales_id')
                .in('sales_id', stringSalesIds); // <--- SUSPECT POINT
            if (sErr) out += `USERS (SALES_ID) ERROR: ${JSON.stringify(sErr)}\n`;
            else out += "Users (Sales ID) fetch OK.\n";
        }
    }

    // 4. Check Students table (official)
    out += "\n4. Fetching Official Students (students table)...\n";
    const { error: officialError } = await supabase
        .from('students')
        .select('email, student_id')
        .eq('batch_id', batchId);

    if (officialError) {
        out += `OFFICIAL STUDENTS ERROR: ${JSON.stringify(officialError)}\n`;
    } else {
        out += "Official students fetch OK.\n";
    }

    // Check users table schema for sales_id type
    out += "\n--- Checking users table schema ---\n";
    out += "Testing users.sales_id with 'TEXT_TEST':\n";
    const { error: uTestErr } = await supabase.from('users').select('*').eq('sales_id', 'TEXT_TEST').limit(1);
    if (uTestErr) {
        out += `users.sales_id might be UUID? Error: ${JSON.stringify(uTestErr)}\n`;
    } else {
        out += "users.sales_id accepts TEXT.\n";
    }

    console.log(out);
    fs.writeFileSync('repro_result.txt', out);
}

reproPageLoad();

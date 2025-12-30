-- Create schools table with minimal columns as requested
CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "school" text,
    "school_code" text,
    "last_code" integer DEFAULT 0
);

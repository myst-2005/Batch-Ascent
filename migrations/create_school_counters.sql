-- Create school_counters table required by ID generation trigger
CREATE TABLE IF NOT EXISTS "public"."school_counters" (
    "school_code" text NOT NULL,
    "year" integer NOT NULL,
    "count" integer DEFAULT 0,
    PRIMARY KEY ("school_code", "year")
);

-- Grant permissions if needed
GRANT ALL ON TABLE "public"."school_counters" TO postgres;
GRANT ALL ON TABLE "public"."school_counters" TO service_role;
GRANT ALL ON TABLE "public"."school_counters" TO authenticated;

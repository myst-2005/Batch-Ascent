-- Seed School Codes starting at 1000
-- Uses ON CONFLICT to update if rows exist
INSERT INTO "public"."schools" ("school", "school_code", "last_code")
VALUES
    ('Tech School', 'TS', 1000),
    ('Finance School', 'FS', 1000),
    ('Marketing School', 'MS', 1000),
    ('Design School', 'DS', 1000)
ON CONFLICT ("school_code") DO UPDATE
SET "last_code" = 1000;

-- Force delete and re-insert to ensure data is present
DELETE FROM "public"."schools";

INSERT INTO "public"."schools" ("school", "school_code", "last_code")
VALUES
    ('Tech School', 'TS', 1000),
    ('Finance School', 'FS', 1000),
    ('Marketing School', 'MS', 1000),
    ('Design School', 'DS', 1000);

-- It seems the 'batches' table has the 'id' column set as UUID, 
-- but you are trying to enter a custom text ID (like "N8N03").
-- Run this SQL to change the column type to TEXT.

ALTER TABLE batches ALTER COLUMN id DROP DEFAULT;
ALTER TABLE batches ALTER COLUMN id TYPE text;

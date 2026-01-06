-- 1. Add 'is_full' column to batches table
ALTER TABLE batches 
ADD COLUMN IF NOT EXISTS is_full BOOLEAN DEFAULT FALSE;

-- 2. Backfill existing data: Set True for any batch that is already full
UPDATE batches 
SET is_full = (
  (SELECT count(*) FROM student_batches WHERE batch_id = batches.id) >= strength
);

-- 3. Create Function to auto-update 'is_full' status
CREATE OR REPLACE FUNCTION update_batch_full_status()
RETURNS TRIGGER AS $$
DECLARE
  _batch_id UUID;
  _strength INT;
  _current_count INT;
BEGIN
  -- Determine batch_id depending on operation
  IF (TG_OP = 'DELETE') THEN
    _batch_id := OLD.batch_id;
  ELSE
    _batch_id := NEW.batch_id;
  END IF;

  -- Get the batch strength
  SELECT strength INTO _strength FROM batches WHERE id = _batch_id;
  
  -- Get the new count of students
  SELECT count(*) INTO _current_count FROM student_batches WHERE batch_id = _batch_id;

  -- Update the is_full flag
  IF _strength IS NOT NULL THEN
    UPDATE batches 
    SET is_full = (_current_count >= _strength)
    WHERE id = _batch_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create Trigger to run AFTER Insert or Delete on student_batches
DROP TRIGGER IF EXISTS trg_update_batch_full ON student_batches;

CREATE TRIGGER trg_update_batch_full
AFTER INSERT OR DELETE ON student_batches
FOR EACH ROW
EXECUTE FUNCTION update_batch_full_status();

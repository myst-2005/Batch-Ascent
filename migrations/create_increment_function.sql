-- Drop previous version of function to allow return type change
DROP FUNCTION IF EXISTS increment_school_counter_sd(text);

-- Create RPC function to increment school counter and return sequence
-- Used by n8n workflow
CREATE OR REPLACE FUNCTION increment_school_counter_sd(p_school_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seq integer;
BEGIN
    -- Try to update existing counter
    UPDATE schools
    SET last_code = COALESCE(last_code, 0) + 1
    WHERE school_code = p_school_code
    RETURNING last_code INTO v_seq;

    -- If school doesn't exist, create it
    IF NOT FOUND THEN
        INSERT INTO schools (school_code, last_code, school)
        VALUES (p_school_code, 1, 'Auto-Created')
        RETURNING last_code INTO v_seq;
    END IF;

    -- Return result in expected JSON format
    RETURN json_build_object('seq', v_seq);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_school_counter_sd(text) TO postgres;
GRANT EXECUTE ON FUNCTION increment_school_counter_sd(text) TO service_role;
GRANT EXECUTE ON FUNCTION increment_school_counter_sd(text) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_school_counter_sd(text) TO anon;

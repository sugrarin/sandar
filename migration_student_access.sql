-- Migration to add function for checking student access
-- Run in SQL Editor Supabase

-- Function to check if viewer has access to student stats
CREATE OR REPLACE FUNCTION check_student_access(p_viewer_id UUID, p_student_id UUID)
RETURNS TABLE (has_access BOOLEAN, access_id UUID) AS $$
DECLARE
    v_access_id UUID;
BEGIN
    -- Check if viewer has active access to student
    SELECT sa.id INTO v_access_id
    FROM share_access sa
    JOIN share_codes sc ON sa.share_code_id = sc.id
    WHERE sa.viewer_id = p_viewer_id
    AND sc.user_id = p_student_id
    AND sa.is_active = TRUE
    LIMIT 1;

    -- If access found, return it
    IF v_access_id IS NOT NULL THEN
        RETURN QUERY SELECT TRUE, v_access_id;
    -- Otherwise check if viewer is the student themselves
    ELSIF p_viewer_id = p_student_id THEN
        RETURN QUERY SELECT TRUE, NULL::UUID;
    -- No access
    ELSE
        RETURN QUERY SELECT FALSE, NULL::UUID;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

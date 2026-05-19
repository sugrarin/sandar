-- Migration to add function for checking student access
-- Run in SQL Editor Supabase

-- Function to check if viewer has access to student stats
CREATE OR REPLACE FUNCTION check_student_access(p_viewer_id UUID, p_student_id UUID)
RETURNS TABLE (has_access BOOLEAN, access_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT
        TRUE,
        sa.id
    FROM share_access sa
    JOIN share_codes sc ON sa.share_code_id = sc.id
    WHERE sa.viewer_id = p_viewer_id
    AND sc.user_id = p_student_id
    AND sa.is_active = TRUE
    LIMIT 1
    UNION ALL
    SELECT
        p_viewer_id = p_student_id,
        NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

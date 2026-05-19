-- Migration to fix infinite recursion in RLS policies
-- Run in SQL Editor Supabase

-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view activated share codes" ON share_codes;
DROP POLICY IF EXISTS "Owners can view share access for their codes" ON share_access;
DROP POLICY IF EXISTS "Owners can revoke access to their codes" ON share_access;

-- Create SECURITY DEFINER functions to bypass RLS

-- Function to validate a share code (bypasses RLS for code lookup)
CREATE OR REPLACE FUNCTION validate_share_code(p_code TEXT)
RETURNS TABLE (id UUID, user_id UUID, is_active BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT sc.id, sc.user_id, sc.is_active
    FROM share_codes sc
    WHERE sc.code = UPPER(p_code)
    AND sc.is_active = TRUE
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get share access for a code owner (bypasses RLS)
CREATE OR REPLACE FUNCTION get_owner_share_access(p_owner_id UUID)
RETURNS TABLE (
    id UUID,
    share_code_id UUID,
    viewer_id UUID,
    activated_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN,
    viewer_display_name TEXT,
    viewer_email TEXT,
    viewer_avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sa.id,
        sa.share_code_id,
        sa.viewer_id,
        sa.activated_at,
        sa.is_active,
        p.display_name,
        p.email,
        p.avatar_url
    FROM share_access sa
    JOIN share_codes sc ON sa.share_code_id = sc.id
    JOIN profiles p ON sa.viewer_id = p.id
    WHERE sc.user_id = p_owner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get viewed students for a viewer (bypasses RLS)
CREATE OR REPLACE FUNCTION get_viewed_students(p_viewer_id UUID)
RETURNS TABLE (
    id UUID,
    student_id UUID,
    student_display_name TEXT,
    student_email TEXT,
    student_avatar_url TEXT,
    activated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sa.id,
        sc.user_id AS student_id,
        p.display_name AS student_display_name,
        p.email AS student_email,
        p.avatar_url AS student_avatar_url,
        sa.activated_at
    FROM share_access sa
    JOIN share_codes sc ON sa.share_code_id = sc.id
    JOIN profiles p ON sc.user_id = p.id
    WHERE sa.viewer_id = p_viewer_id
    AND sa.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke access by owner (bypasses RLS)
CREATE OR REPLACE FUNCTION revoke_access_by_owner(p_access_id UUID, p_owner_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE share_access
    SET is_active = FALSE
    WHERE id = p_access_id
    AND share_code_id IN (
        SELECT id FROM share_codes WHERE user_id = p_owner_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

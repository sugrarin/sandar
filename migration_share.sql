-- Migration: Simplified share functionality
-- Run in SQL Editor Supabase

-- Drop old tables and related objects
DROP TABLE IF EXISTS share_rate_limit CASCADE;
DROP TABLE IF EXISTS share_access CASCADE;
DROP TABLE IF EXISTS share_codes CASCADE;

-- Drop old functions
DROP FUNCTION IF EXISTS public.handle_new_share_access();
DROP FUNCTION IF EXISTS get_or_create_share_code(UUID);
DROP FUNCTION IF EXISTS validate_share_code(TEXT);
DROP FUNCTION IF EXISTS get_owner_share_access(UUID);
DROP FUNCTION IF EXISTS get_viewed_students(UUID);
DROP FUNCTION IF EXISTS revoke_access_by_owner(UUID, UUID);
DROP FUNCTION IF EXISTS check_rate_limit(UUID);
DROP FUNCTION IF EXISTS record_failed_attempt(UUID);
DROP FUNCTION IF EXISTS reset_rate_limit(UUID);

-- Share codes table
CREATE TABLE IF NOT EXISTS share_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Share access table (no denormalized viewer data — joined from profiles)
CREATE TABLE IF NOT EXISTS share_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_code_id UUID NOT NULL REFERENCES share_codes(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(share_code_id, viewer_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_share_codes_user_id ON share_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_share_codes_code ON share_codes(code);
CREATE INDEX IF NOT EXISTS idx_share_access_share_code_id ON share_access(share_code_id);
CREATE INDEX IF NOT EXISTS idx_share_access_viewer_id ON share_access(viewer_id);

-- RLS
ALTER TABLE share_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own share codes" ON share_codes;
CREATE POLICY "Users can manage own share codes" ON share_codes
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own access" ON share_access;
CREATE POLICY "Users can view own access" ON share_access
    FOR SELECT USING (
        auth.uid() = viewer_id
        OR share_code_id IN (SELECT id FROM share_codes WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update own access" ON share_access;
CREATE POLICY "Users can update own access" ON share_access
    FOR UPDATE USING (
        auth.uid() = viewer_id
        OR share_code_id IN (SELECT id FROM share_codes WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert own access" ON share_access;
CREATE POLICY "Users can insert own access" ON share_access
    FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- get_or_create_share_code
CREATE OR REPLACE FUNCTION get_or_create_share_code(p_user_id UUID)
RETURNS TABLE(id UUID, code TEXT, created_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
    v_id UUID;
    v_code TEXT;
    v_created_at TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT sc.id, sc.code, sc.created_at
    INTO v_id, v_code, v_created_at
    FROM share_codes sc
    WHERE sc.user_id = p_user_id
    LIMIT 1;

    IF v_id IS NULL THEN
        v_code := upper(substring(md5(random()::text) from 1 for 8));
        INSERT INTO share_codes (user_id, code)
        VALUES (p_user_id, v_code)
        RETURNING share_codes.id, share_codes.code, share_codes.created_at
        INTO v_id, v_code, v_created_at;
    END IF;

    RETURN QUERY SELECT v_id, v_code, v_created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- validate_share_code
CREATE OR REPLACE FUNCTION validate_share_code(p_code TEXT)
RETURNS TABLE(id UUID, user_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT sc.id, sc.user_id
    FROM share_codes sc
    WHERE sc.code = upper(p_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_owner_share_access
CREATE OR REPLACE FUNCTION get_owner_share_access(p_owner_id UUID)
RETURNS TABLE(
    id UUID,
    share_code_id UUID,
    viewer_id UUID,
    viewer_email TEXT,
    viewer_display_name TEXT,
    viewer_avatar_url TEXT,
    activated_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT sa.id, sa.share_code_id, sa.viewer_id, p.email,
           COALESCE(p.display_name, split_part(p.email, '@', 1)), p.avatar_url, sa.created_at, sa.is_active
    FROM share_access sa
    JOIN share_codes sc ON sa.share_code_id = sc.id
    JOIN profiles p ON p.id = sa.viewer_id
    WHERE sc.user_id = p_owner_id AND sa.is_active = TRUE
    ORDER BY sa.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_viewed_students
CREATE OR REPLACE FUNCTION get_viewed_students(p_viewer_id UUID)
RETURNS TABLE(
    id UUID,
    student_id UUID,
    student_email TEXT,
    student_display_name TEXT,
    student_avatar_url TEXT,
    activated_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT sa.id, sc.user_id, p.email,
           COALESCE(p.display_name, split_part(p.email, '@', 1)), p.avatar_url, sa.created_at, sa.is_active
    FROM share_access sa
    JOIN share_codes sc ON sa.share_code_id = sc.id
    JOIN profiles p ON p.id = sc.user_id
    WHERE sa.viewer_id = p_viewer_id AND sa.is_active = TRUE
    ORDER BY sa.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- check_student_access
CREATE OR REPLACE FUNCTION check_student_access(p_viewer_id UUID, p_student_id UUID)
RETURNS TABLE(has_access BOOLEAN, access_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT TRUE, sa.id
    FROM share_access sa
    JOIN share_codes sc ON sa.share_code_id = sc.id
    WHERE sa.viewer_id = p_viewer_id
      AND sc.user_id = p_student_id
      AND sa.is_active = TRUE
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- revoke_access_by_owner
CREATE OR REPLACE FUNCTION revoke_access_by_owner(p_access_id UUID, p_owner_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE share_access
    SET is_active = FALSE
    WHERE id = p_access_id
      AND share_code_id IN (SELECT id FROM share_codes WHERE user_id = p_owner_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

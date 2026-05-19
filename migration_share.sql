-- Migration: Full share functionality
-- Run in SQL Editor Supabase

-- Share codes table
CREATE TABLE IF NOT EXISTS share_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Share access table
CREATE TABLE IF NOT EXISTS share_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_code_id UUID NOT NULL REFERENCES share_codes(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    viewer_email TEXT NOT NULL DEFAULT '',
    viewer_display_name TEXT NOT NULL DEFAULT '',
    viewer_avatar_url TEXT,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(share_code_id, viewer_id)
);

-- Rate limit table
CREATE TABLE IF NOT EXISTS share_rate_limit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_share_codes_user_id ON share_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_share_codes_code ON share_codes(code);
CREATE INDEX IF NOT EXISTS idx_share_access_share_code_id ON share_access(share_code_id);
CREATE INDEX IF NOT EXISTS idx_share_access_viewer_id ON share_access(viewer_id);

-- Trigger to auto-fill viewer profile data on insert
CREATE OR REPLACE FUNCTION public.handle_new_share_access()
RETURNS TRIGGER AS $$
BEGIN
    SELECT email, COALESCE(display_name, split_part(email, '@', 1)), avatar_url 
    INTO NEW.viewer_email, NEW.viewer_display_name, NEW.viewer_avatar_url
    FROM profiles WHERE id = NEW.viewer_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_share_access_insert ON share_access;
CREATE TRIGGER on_share_access_insert
    BEFORE INSERT ON share_access
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_share_access();

-- RLS
ALTER TABLE share_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_rate_limit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own share codes" ON share_codes;
CREATE POLICY "Users can manage own share codes" ON share_codes
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own access" ON share_access;
CREATE POLICY "Users can view own access" ON share_access
    FOR SELECT USING (auth.uid() = viewer_id OR share_code_id IN (SELECT id FROM share_codes WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own access" ON share_access;
CREATE POLICY "Users can update own access" ON share_access
    FOR UPDATE USING (auth.uid() = viewer_id OR share_code_id IN (SELECT id FROM share_codes WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own access" ON share_access;
CREATE POLICY "Users can insert own access" ON share_access
    FOR INSERT WITH CHECK (auth.uid() = viewer_id);

DROP POLICY IF EXISTS "Users can manage own rate limit" ON share_rate_limit;
CREATE POLICY "Users can manage own rate limit" ON share_rate_limit
    FOR ALL USING (auth.uid() = user_id);

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
    WHERE sc.user_id = p_user_id AND sc.is_active = TRUE
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
RETURNS TABLE(id UUID, user_id UUID, code TEXT, is_active BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT sc.id, sc.user_id, sc.code, sc.is_active
    FROM share_codes sc
    WHERE sc.code = upper(p_code) AND sc.is_active = TRUE;
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
    SELECT sa.id, sa.share_code_id, sa.viewer_id, sa.viewer_email,
           sa.viewer_display_name, sa.viewer_avatar_url, sa.activated_at, sa.is_active
    FROM share_access sa
    JOIN share_codes sc ON sa.share_code_id = sc.id
    WHERE sc.user_id = p_owner_id AND sa.is_active = TRUE
    ORDER BY sa.activated_at DESC;
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
    SELECT sa.id, sc.user_id, p.email, p.display_name, p.avatar_url, sa.activated_at, sa.is_active
    FROM share_access sa
    JOIN share_codes sc ON sa.share_code_id = sc.id
    JOIN profiles p ON p.id = sc.user_id
    WHERE sa.viewer_id = p_viewer_id AND sa.is_active = TRUE
    ORDER BY sa.activated_at DESC;
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

-- check_rate_limit
CREATE OR REPLACE FUNCTION check_rate_limit(p_user_id UUID)
RETURNS TABLE(allowed BOOLEAN, locked_until TIMESTAMP WITH TIME ZONE, error_message TEXT) AS $$
DECLARE
    v_record share_rate_limit%ROWTYPE;
BEGIN
    SELECT * INTO v_record FROM share_rate_limit WHERE user_id = p_user_id;
    
    IF FOUND AND v_record.locked_until IS NOT NULL AND v_record.locked_until > NOW() THEN
        IF v_record.failed_attempts >= 4 THEN
            RETURN QUERY SELECT FALSE, v_record.locked_until, 'locked_day'::TEXT;
        ELSE
            RETURN QUERY SELECT FALSE, v_record.locked_until, 'locked_minute'::TEXT;
        END IF;
    ELSE
        RETURN QUERY SELECT TRUE, NULL::TIMESTAMP WITH TIME ZONE, NULL::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- record_failed_attempt
CREATE OR REPLACE FUNCTION record_failed_attempt(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_record share_rate_limit%ROWTYPE;
BEGIN
    SELECT * INTO v_record FROM share_rate_limit WHERE user_id = p_user_id;
    
    IF FOUND THEN
        UPDATE share_rate_limit
        SET failed_attempts = failed_attempts + 1,
            last_attempt_at = NOW(),
            locked_until = CASE
                WHEN failed_attempts + 1 >= 4 THEN NOW() + INTERVAL '1 day'
                WHEN failed_attempts + 1 >= 3 THEN NOW() + INTERVAL '1 minute'
                ELSE NULL
            END
        WHERE user_id = p_user_id;
    ELSE
        INSERT INTO share_rate_limit (user_id, failed_attempts, last_attempt_at)
        VALUES (p_user_id, 1, NOW());
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- reset_rate_limit
CREATE OR REPLACE FUNCTION reset_rate_limit(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE share_rate_limit
    SET failed_attempts = 0, locked_until = NULL
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

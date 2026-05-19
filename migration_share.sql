-- Migration for Shared Access feature
-- Run in SQL Editor Supabase

-- Table for share codes (students generate these)
CREATE TABLE IF NOT EXISTS share_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id) -- One active code per user
);

-- Table for share access (who activated which code)
CREATE TABLE IF NOT EXISTS share_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_code_id UUID NOT NULL REFERENCES share_codes(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(share_code_id, viewer_id) -- One viewer per code
);

-- Table for rate limiting (prevent brute force on code entry)
CREATE TABLE IF NOT EXISTS share_rate_limit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_share_codes_user_id ON share_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_share_codes_code ON share_codes(code);
CREATE INDEX IF NOT EXISTS idx_share_access_share_code_id ON share_access(share_code_id);
CREATE INDEX IF NOT EXISTS idx_share_access_viewer_id ON share_access(viewer_id);
CREATE INDEX IF NOT EXISTS idx_share_rate_limit_user_id ON share_rate_limit(user_id);

-- RLS Policies
ALTER TABLE share_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_rate_limit ENABLE ROW LEVEL SECURITY;

-- Users can view their own share codes
CREATE POLICY "Users can view own share codes" ON share_codes
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own share codes
CREATE POLICY "Users can insert own share codes" ON share_codes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own share codes
CREATE POLICY "Users can update own share codes" ON share_codes
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can view their own share access records (as viewer)
CREATE POLICY "Viewers can view their share access" ON share_access
    FOR SELECT USING (auth.uid() = viewer_id);

-- Users can insert share access (activate a code)
CREATE POLICY "Users can insert share access" ON share_access
    FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- Users can update their own share access (revoke)
CREATE POLICY "Viewers can update their share access" ON share_access
    FOR UPDATE USING (auth.uid() = viewer_id);

-- Users can view their own rate limit
CREATE POLICY "Users can view own rate limit" ON share_rate_limit
    FOR ALL USING (auth.uid() = user_id);

-- Users can insert their own rate limit
CREATE POLICY "Users can insert own rate limit" ON share_rate_limit
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own rate limit
CREATE POLICY "Users can update own rate limit" ON share_rate_limit
    FOR UPDATE USING (auth.uid() = user_id);

-- Function to generate a random share code
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    code TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        code := code || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create share code for a user
CREATE OR REPLACE FUNCTION get_or_create_share_code(p_user_id UUID)
RETURNS TABLE (code TEXT, created_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
    v_code TEXT;
    v_created_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Try to get existing active code
    SELECT sc.code, sc.created_at
    INTO v_code, v_created_at
    FROM share_codes sc
    WHERE sc.user_id = p_user_id AND sc.is_active = TRUE
    LIMIT 1;

    -- If no code found, create one
    IF NOT FOUND THEN
        LOOP
            v_code := generate_share_code();
            BEGIN
                INSERT INTO share_codes (user_id, code)
                VALUES (p_user_id, v_code)
                RETURNING share_codes.code, share_codes.created_at
                INTO v_code, v_created_at;
                EXIT;
            EXCEPTION WHEN unique_violation THEN
                -- retry with a new code
                CONTINUE;
            END;
        END LOOP;
    END IF;

    RETURN QUERY SELECT v_code, v_created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limit before code activation
CREATE OR REPLACE FUNCTION check_rate_limit(p_user_id UUID)
RETURNS TABLE (allowed BOOLEAN, error_message TEXT, locked_until TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
    v_limit RECORD;
BEGIN
    SELECT * INTO v_limit
    FROM share_rate_limit
    WHERE user_id = p_user_id;
    
    -- No previous attempts
    IF NOT FOUND THEN
        INSERT INTO share_rate_limit (user_id, failed_attempts, locked_until)
        VALUES (p_user_id, 0, NULL);
        RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Check if locked
    IF v_limit.locked_until IS NOT NULL AND v_limit.locked_until > NOW() THEN
        RETURN QUERY SELECT FALSE, 
            CASE 
                WHEN v_limit.failed_attempts >= 4 THEN 'locked_day'
                ELSE 'locked_minute'
            END,
            v_limit.locked_until;
        RETURN;
    END IF;
    
    -- Reset if lock expired
    IF v_limit.locked_until IS NOT NULL AND v_limit.locked_until <= NOW() THEN
        UPDATE share_rate_limit
        SET failed_attempts = 0, locked_until = NULL
        WHERE user_id = p_user_id;
        RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record failed code attempt
CREATE OR REPLACE FUNCTION record_failed_attempt(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_failed_attempts INTEGER;
BEGIN
    UPDATE share_rate_limit
    SET failed_attempts = failed_attempts + 1,
        last_attempt_at = NOW(),
        locked_until = CASE
            WHEN failed_attempts + 1 >= 4 THEN NOW() + INTERVAL '1 day'
            WHEN failed_attempts + 1 >= 3 THEN NOW() + INTERVAL '1 minute'
            ELSE NULL
        END
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset rate limit on successful activation
CREATE OR REPLACE FUNCTION reset_rate_limit(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE share_rate_limit
    SET failed_attempts = 0, locked_until = NULL
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

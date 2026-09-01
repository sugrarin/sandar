-- Restrict SECURITY DEFINER share functions to the authenticated caller.
-- Run once in the Supabase SQL Editor after migration_share.sql.

CREATE OR REPLACE FUNCTION get_or_create_share_code(p_user_id UUID)
RETURNS TABLE(id UUID, code TEXT, created_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
    v_id UUID;
    v_code TEXT;
    v_created_at TIMESTAMP WITH TIME ZONE;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
    IF auth.uid() IS NULL OR auth.uid() <> p_owner_id THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT sa.id, sa.share_code_id, sa.viewer_id, p.email,
           COALESCE(p.display_name, split_part(p.email, '@', 1)),
           p.avatar_url, sa.created_at, sa.is_active
    FROM share_access sa
    JOIN share_codes sc ON sa.share_code_id = sc.id
    JOIN profiles p ON p.id = sa.viewer_id
    WHERE sc.user_id = p_owner_id AND sa.is_active = TRUE
    ORDER BY sa.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
    IF auth.uid() IS NULL OR auth.uid() <> p_viewer_id THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT sa.id, sc.user_id, p.email,
           COALESCE(p.display_name, split_part(p.email, '@', 1)),
           p.avatar_url, sa.created_at, sa.is_active
    FROM share_access sa
    JOIN share_codes sc ON sa.share_code_id = sc.id
    JOIN profiles p ON p.id = sc.user_id
    WHERE sa.viewer_id = p_viewer_id AND sa.is_active = TRUE
    ORDER BY sa.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION check_student_access(
    p_viewer_id UUID,
    p_student_id UUID
)
RETURNS TABLE(has_access BOOLEAN, access_id UUID) AS $$
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_viewer_id THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT TRUE, sa.id
    FROM share_access sa
    JOIN share_codes sc ON sa.share_code_id = sc.id
    WHERE sa.viewer_id = p_viewer_id
      AND sc.user_id = p_student_id
      AND sa.is_active = TRUE
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_student_profile(p_student_id UUID)
RETURNS TABLE(
    id UUID,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.email, p.display_name, p.avatar_url, p.created_at
    FROM profiles p
    WHERE p.id = p_student_id
      AND EXISTS (
          SELECT 1
          FROM share_access sa
          JOIN share_codes sc ON sc.id = sa.share_code_id
          WHERE sa.viewer_id = auth.uid()
            AND sc.user_id = p_student_id
            AND sa.is_active = TRUE
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_student_stats(p_student_id UUID)
RETURNS TABLE(
    total_sessions INTEGER,
    total_questions INTEGER,
    total_correct INTEGER,
    total_wrong INTEGER,
    total_time_seconds INTEGER,
    total_xp INTEGER,
    current_streak INTEGER,
    best_streak INTEGER,
    streak_days INTEGER,
    last_session_at TIMESTAMP WITH TIME ZONE,
    last_session_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT us.total_sessions, us.total_questions, us.total_correct,
           us.total_wrong, us.total_time_seconds, us.total_xp,
           us.current_streak, us.best_streak, us.streak_days,
           us.last_session_at, us.last_session_date, us.updated_at
    FROM user_stats us
    WHERE us.user_id = p_student_id
      AND EXISTS (
          SELECT 1
          FROM share_access sa
          JOIN share_codes sc ON sc.id = sa.share_code_id
          WHERE sa.viewer_id = auth.uid()
            AND sc.user_id = p_student_id
            AND sa.is_active = TRUE
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_student_mode_stats(p_student_id UUID)
RETURNS TABLE(
    id UUID,
    mode TEXT,
    difficulty TEXT,
    sessions_count INTEGER,
    questions_count INTEGER,
    correct_count INTEGER,
    wrong_count INTEGER,
    avg_time_per_question NUMERIC,
    last_played_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT ms.id, ms.mode, ms.difficulty, ms.sessions_count,
           ms.questions_count, ms.correct_count, ms.wrong_count,
           ms.avg_time_per_question, ms.last_played_at
    FROM mode_stats ms
    WHERE ms.user_id = p_student_id
      AND EXISTS (
          SELECT 1
          FROM share_access sa
          JOIN share_codes sc ON sc.id = sa.share_code_id
          WHERE sa.viewer_id = auth.uid()
            AND sc.user_id = p_student_id
            AND sa.is_active = TRUE
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_student_activity(p_student_id UUID)
RETURNS TABLE(
    created_at TIMESTAMP WITH TIME ZONE,
    total_questions INTEGER,
    correct_answers INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.created_at, s.total_questions, s.correct_answers
    FROM sessions s
    WHERE s.user_id = p_student_id
      AND EXISTS (
          SELECT 1
          FROM share_access sa
          JOIN share_codes sc ON sc.id = sa.share_code_id
          WHERE sa.viewer_id = auth.uid()
            AND sc.user_id = p_student_id
            AND sa.is_active = TRUE
      )
    ORDER BY s.created_at DESC
    LIMIT 180;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION revoke_access_by_owner(
    p_access_id UUID,
    p_owner_id UUID
)
RETURNS VOID AS $$
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_owner_id THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    UPDATE share_access
    SET is_active = FALSE
    WHERE id = p_access_id
      AND share_code_id IN (
          SELECT id FROM share_codes WHERE user_id = p_owner_id
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

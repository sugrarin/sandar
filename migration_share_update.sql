-- Update: Add student data RPC functions (run AFTER migration_share.sql)
-- Run in SQL Editor Supabase

DROP FUNCTION IF EXISTS get_student_profile(UUID);
DROP FUNCTION IF EXISTS get_student_stats(UUID);
DROP FUNCTION IF EXISTS get_student_mode_stats(UUID);
DROP FUNCTION IF EXISTS get_student_activity(UUID);

-- get_student_profile
CREATE OR REPLACE FUNCTION get_student_profile(p_student_id UUID)
RETURNS TABLE(id UUID, email TEXT, display_name TEXT, avatar_url TEXT, created_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.email, p.display_name, p.avatar_url, p.created_at
    FROM profiles p
    WHERE p.id = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_student_stats
CREATE OR REPLACE FUNCTION get_student_stats(p_student_id UUID)
RETURNS TABLE(
    total_sessions INTEGER, total_questions INTEGER, total_correct INTEGER,
    total_wrong INTEGER, total_time_seconds INTEGER, total_xp INTEGER,
    current_streak INTEGER, best_streak INTEGER, streak_days INTEGER,
    last_session_at TIMESTAMP WITH TIME ZONE, last_session_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT us.total_sessions, us.total_questions, us.total_correct,
           us.total_wrong, us.total_time_seconds, us.total_xp,
           us.current_streak, us.best_streak, us.streak_days,
           us.last_session_at, us.last_session_date, us.updated_at
    FROM user_stats us
    WHERE us.user_id = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_student_mode_stats
CREATE OR REPLACE FUNCTION get_student_mode_stats(p_student_id UUID)
RETURNS TABLE(
    id UUID, mode TEXT, difficulty TEXT, sessions_count INTEGER,
    questions_count INTEGER, correct_count INTEGER, wrong_count INTEGER,
    avg_time_per_question NUMERIC, last_played_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT ms.id, ms.mode, ms.difficulty, ms.sessions_count,
           ms.questions_count, ms.correct_count, ms.wrong_count,
           ms.avg_time_per_question, ms.last_played_at
    FROM mode_stats ms
    WHERE ms.user_id = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_student_activity
CREATE OR REPLACE FUNCTION get_student_activity(p_student_id UUID)
RETURNS TABLE(created_at TIMESTAMP WITH TIME ZONE, total_questions INTEGER, correct_answers INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT s.created_at, s.total_questions, s.correct_answers
    FROM sessions s
    WHERE s.user_id = p_student_id
    ORDER BY s.created_at DESC
    LIMIT 180;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

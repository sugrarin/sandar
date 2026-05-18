-- Migration: Add XP and Streak Days to user_stats
-- Run this in Supabase SQL Editor to update existing database

-- 1. Add new columns to user_stats table (safe migration - won't lose data)
ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_session_date DATE;

-- 2. Update existing rows to have default values
UPDATE user_stats SET total_xp = 0 WHERE total_xp IS NULL;
UPDATE user_stats SET streak_days = 0 WHERE streak_days IS NULL;

-- 3. Recreate the trigger function with XP calculation
CREATE OR REPLACE FUNCTION update_user_stats_after_session()
RETURNS TRIGGER AS $$
BEGIN
    -- Обновляем или создаем общую статистику
    INSERT INTO user_stats (
        user_id, total_sessions, total_questions, total_correct, 
        total_wrong, total_time_seconds, total_xp, current_streak, best_streak, streak_days,
        last_session_at, last_session_date, updated_at
    )
    VALUES (
        NEW.user_id, 1, NEW.total_questions, NEW.correct_answers,
        NEW.wrong_answers, COALESCE(NEW.duration_seconds, 0),
        NEW.correct_answers * CASE NEW.difficulty
            WHEN 'easy' THEN 10
            WHEN 'medium' THEN 15
            WHEN 'hard' THEN 20
            WHEN 'brain' THEN 30
            ELSE 10
        END,
        CASE WHEN NEW.correct_answers = NEW.total_questions THEN 1 ELSE 0 END,
        CASE WHEN NEW.correct_answers = NEW.total_questions THEN 1 ELSE 0 END,
        1,
        NEW.created_at, CURRENT_DATE, NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_sessions = user_stats.total_sessions + 1,
        total_questions = user_stats.total_questions + NEW.total_questions,
        total_correct = user_stats.total_correct + NEW.correct_answers,
        total_wrong = user_stats.total_wrong + NEW.wrong_answers,
        total_time_seconds = user_stats.total_time_seconds + COALESCE(NEW.duration_seconds, 0),
        total_xp = user_stats.total_xp + 
            (NEW.correct_answers * CASE NEW.difficulty
                WHEN 'easy' THEN 10
                WHEN 'medium' THEN 15
                WHEN 'hard' THEN 20
                WHEN 'brain' THEN 30
                ELSE 10
            END) +
            (CASE 
                WHEN NEW.correct_answers = NEW.total_questions AND user_stats.current_streak > 0 AND (user_stats.current_streak + 1) % 5 = 0 
                THEN 50 
                ELSE 0 
            END),
        current_streak = CASE 
            WHEN NEW.correct_answers = NEW.total_questions THEN user_stats.current_streak + 1
            ELSE 0
        END,
        best_streak = CASE 
            WHEN NEW.correct_answers = NEW.total_questions AND user_stats.current_streak + 1 > user_stats.best_streak 
            THEN user_stats.current_streak + 1
            ELSE user_stats.best_streak
        END,
        streak_days = CASE 
            WHEN user_stats.last_session_date IS NULL OR user_stats.last_session_date < CURRENT_DATE - INTERVAL '1 day' THEN 1
            WHEN user_stats.last_session_date = CURRENT_DATE THEN user_stats.streak_days
            ELSE user_stats.streak_days + 1
        END,
        last_session_at = NEW.created_at,
        last_session_date = CURRENT_DATE,
        updated_at = NOW();

    -- Обновляем статистику по режиму
    INSERT INTO mode_stats (
        user_id, mode, difficulty, sessions_count, questions_count,
        correct_count, wrong_count, last_played_at
    )
    VALUES (
        NEW.user_id, NEW.mode, NEW.difficulty, 1, NEW.total_questions,
        NEW.correct_answers, NEW.wrong_answers, NEW.created_at
    )
    ON CONFLICT (user_id, mode, difficulty) DO UPDATE SET
        sessions_count = mode_stats.sessions_count + 1,
        questions_count = mode_stats.questions_count + NEW.total_questions,
        correct_count = mode_stats.correct_count + NEW.correct_answers,
        wrong_count = mode_stats.wrong_count + NEW.wrong_answers,
        last_played_at = NEW.created_at;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure trigger exists (drop and recreate to be sure)
DROP TRIGGER IF EXISTS on_session_completed ON sessions;
CREATE TRIGGER on_session_completed
    AFTER INSERT ON sessions
    FOR EACH ROW
    WHEN (NEW.completed_at IS NOT NULL)
    EXECUTE FUNCTION update_user_stats_after_session();

-- 5. Update user_dashboard view to include new fields
CREATE OR REPLACE VIEW user_dashboard AS
SELECT
    p.id as user_id,
    p.email,
    p.display_name,
    p.created_at as member_since,
    COALESCE(us.total_sessions, 0) as total_sessions,
    COALESCE(us.total_questions, 0) as total_questions,
    COALESCE(us.total_correct, 0) as total_correct,
    COALESCE(us.total_wrong, 0) as total_wrong,
    CASE 
        WHEN us.total_questions > 0 
        THEN ROUND((us.total_correct::NUMERIC / us.total_questions) * 100, 1)
        ELSE 0 
    END as accuracy_percent,
    COALESCE(us.total_xp, 0) as total_xp,
    COALESCE(us.current_streak, 0) as current_streak,
    COALESCE(us.best_streak, 0) as best_streak,
    COALESCE(us.streak_days, 0) as streak_days,
    us.last_session_at,
    us.last_session_date,
    (SELECT COUNT(*) FROM achievements a WHERE a.user_id = p.id) as achievements_count
FROM profiles p
LEFT JOIN user_stats us ON us.user_id = p.id;

-- Done! New sessions will now calculate XP and streak days automatically.

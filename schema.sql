-- Схема базы данных для Math Trainer
-- Запустите в SQL Editor Supabase

-- Таблица профилей пользователей
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Триггер для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем триггер (только если он не существует)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Таблица сессий (раундов) тренировок
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('addition', 'subtraction', 'multiplication', 'division', 'table', 'mixed', 'review')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'brain')),
    total_questions INTEGER NOT NULL DEFAULT 12,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    wrong_answers INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Таблица детальных ответов на вопросы
CREATE TABLE IF NOT EXISTS session_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    correct_answer INTEGER NOT NULL,
    user_answer INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица общей статистики пользователя
CREATE TABLE IF NOT EXISTS user_stats (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    total_sessions INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    total_correct INTEGER DEFAULT 0,
    total_wrong INTEGER DEFAULT 0,
    total_time_seconds INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    last_session_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица статистики по режимам
CREATE TABLE IF NOT EXISTS mode_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('addition', 'subtraction', 'multiplication', 'division', 'table', 'mixed')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'brain')),
    sessions_count INTEGER DEFAULT 0,
    questions_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    avg_time_per_question NUMERIC(6,2),
    last_played_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, mode, difficulty)
);

-- Таблица достижений
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL,
    achievement_level INTEGER DEFAULT 1,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_type)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_session_answers_session_id ON session_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_mode_stats_user_id ON mode_stats(user_id);

-- Представление для агрегированной статистики
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
    COALESCE(us.current_streak, 0) as current_streak,
    COALESCE(us.best_streak, 0) as best_streak,
    us.last_session_at,
    (SELECT COUNT(*) FROM achievements a WHERE a.user_id = p.id) as achievements_count
FROM profiles p
LEFT JOIN user_stats us ON us.user_id = p.id;

-- Функция для обновления статистики после сессии
CREATE OR REPLACE FUNCTION update_user_stats_after_session()
RETURNS TRIGGER AS $$
BEGIN
    -- Обновляем или создаем общую статистику
    INSERT INTO user_stats (
        user_id, total_sessions, total_questions, total_correct, 
        total_wrong, total_time_seconds, last_session_at, updated_at
    )
    VALUES (
        NEW.user_id, 1, NEW.total_questions, NEW.correct_answers,
        NEW.wrong_answers, COALESCE(NEW.duration_seconds, 0), NEW.created_at, NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_sessions = user_stats.total_sessions + 1,
        total_questions = user_stats.total_questions + NEW.total_questions,
        total_correct = user_stats.total_correct + NEW.correct_answers,
        total_wrong = user_stats.total_wrong + NEW.wrong_answers,
        total_time_seconds = user_stats.total_time_seconds + COALESCE(NEW.duration_seconds, 0),
        current_streak = CASE 
            WHEN NEW.correct_answers = NEW.total_questions THEN user_stats.current_streak + 1
            ELSE 0
        END,
        best_streak = CASE 
            WHEN NEW.correct_answers = NEW.total_questions AND user_stats.current_streak + 1 > user_stats.best_streak 
            THEN user_stats.current_streak + 1
            ELSE user_stats.best_streak
        END,
        last_session_at = NEW.created_at,
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

-- Триггер для обновления статистики
DROP TRIGGER IF EXISTS on_session_completed ON sessions;
CREATE TRIGGER on_session_completed
    AFTER INSERT ON sessions
    FOR EACH ROW
    WHEN (NEW.completed_at IS NOT NULL)
    EXECUTE FUNCTION update_user_stats_after_session();

-- RLS (Row Level Security) политики
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE mode_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Пользователь видит только свои данные
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own sessions" ON sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own answers" ON session_answers
    FOR ALL USING (EXISTS (
        SELECT 1 FROM sessions s WHERE s.id = session_answers.session_id AND s.user_id = auth.uid()
    ));

CREATE POLICY "Users can view own stats" ON user_stats
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own mode stats" ON mode_stats
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own achievements" ON achievements
    FOR ALL USING (auth.uid() = user_id);

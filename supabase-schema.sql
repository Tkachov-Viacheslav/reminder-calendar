-- ==============================================================================
-- СХЕМА БАЗИ ДАНИХ ДЛЯ ПРОЄКТУ «КАЛЕНДАР НАГАДУВАНЬ» (SUPABASE + POSTGRESQL)
-- ==============================================================================

-- 1. ТАБЛИЦЯ НАГАДУВАНЬ (reminders)
CREATE TABLE IF NOT EXISTS public.reminders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'main',
    remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    repeat_type TEXT DEFAULT 'none',
    remind_before INTEGER DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    team_id TEXT,
    thread_id BIGINT,
    tagged_members JSONB DEFAULT '[]'::jsonb,
    created_by_name TEXT DEFAULT ''
);

-- Індекси для швидкого пошуку нагадувань
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON public.reminders (remind_at, is_sent);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders (user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_team_id ON public.reminders (team_id);

-- 2. ТАБЛИЦЯ КОМАНД / ГРУП TELEGRAM (teams)
CREATE TABLE IF NOT EXISTS public.teams (
    id TEXT PRIMARY KEY,
    telegram_chat_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    is_forum BOOLEAN DEFAULT false,
    default_role TEXT DEFAULT 'editor',
    created_by TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. ТАБЛИЦЯ УЧАСНИКІВ КОМАНД (team_members)
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    telegram_id TEXT NOT NULL,
    first_name TEXT DEFAULT '',
    username TEXT DEFAULT '',
    role TEXT DEFAULT 'editor', -- 'admin', 'editor', 'viewer', 'blocked'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT uq_team_members UNIQUE (team_id, telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members (telegram_id);

-- 4. ТАБЛИЦЯ ТЕМ ФОРУМУ TELEGRAM (team_topics)
CREATE TABLE IF NOT EXISTS public.team_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    thread_id BIGINT NOT NULL,
    name TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT uq_team_topics UNIQUE (team_id, thread_id)
);

-- 5. ТАБЛИЦЯ ПРИВ'ЯЗКИ КАТЕГОРІЙ ДО ТЕМ ФОРУМУ (team_category_topics)
CREATE TABLE IF NOT EXISTS public.team_category_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    thread_id BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT uq_team_category_topics UNIQUE (team_id, category)
);

-- 6. ТАБЛИЦЯ ОДНОРАЗОВИХ КОДІВ АВТОРИЗАЦІЇ (auth_codes)
CREATE TABLE IF NOT EXISTS public.auth_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    telegram_id TEXT NOT NULL,
    first_name TEXT DEFAULT '',
    username TEXT DEFAULT '',
    photo_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_codes_lookup ON public.auth_codes (code, expires_at);

-- 7. ТАБЛИЦЯ ВІДСТЕЖЕННЯ РАНКОВИХ ДАЙДЖЕСТІВ (user_digests)
CREATE TABLE IF NOT EXISTS public.user_digests (
    user_id TEXT NOT NULL,
    digest_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (user_id, digest_date)
);

-- 8. ТАБЛИЦЯ КОРИСТУВАЦЬКИХ КАТЕГОРІЙ (user_categories)
CREATE TABLE IF NOT EXISTS public.user_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_categories_uid ON public.user_categories (user_id);

-- 8.1. ТАБЛИЦЯ КОМАНДНИХ КАТЕГОРІЙ (team_categories)
CREATE TABLE IF NOT EXISTS public.team_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_categories_tid ON public.team_categories (team_id);

-- 9. ТАБЛИЦЯ СПІЛЬНИХ ШАБЛОНІВ КОМАНД (team_templates)
CREATE TABLE IF NOT EXISTS public.team_templates (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'main',
    description TEXT DEFAULT '',
    remind_before INTEGER DEFAULT 0,
    repeat_type TEXT DEFAULT 'none',
    time_str TEXT DEFAULT '',
    tagged_members JSONB DEFAULT '[]'::jsonb,
    items JSONB DEFAULT '[]'::jsonb,
    created_by TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_templates_team_id ON public.team_templates (team_id);

-- ==============================================================================
-- БЕЗПЕКА (ROW LEVEL SECURITY) ТА ДОСТУП ДЛЯ ВСІХ ТАБЛИЦЬ
-- ==============================================================================

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_category_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_templates ENABLE ROW LEVEL SECURITY;

-- Політики публічного доступу для веб-додатку
CREATE POLICY "Allow public all reminders" ON public.reminders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all teams" ON public.teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all team_members" ON public.team_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all team_topics" ON public.team_topics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all team_category_topics" ON public.team_category_topics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all auth_codes" ON public.auth_codes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all user_digests" ON public.user_digests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all user_categories" ON public.user_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all team_categories" ON public.team_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all team_templates" ON public.team_templates FOR ALL USING (true) WITH CHECK (true);

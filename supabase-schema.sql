-- Створення таблиці reminders для збереження подій та нагадувань
CREATE TABLE IF NOT EXISTS public.reminders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'personal',
    remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Індекси для прискорення вибірки за датою та статусом
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON public.reminders (remind_at, is_sent);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders (user_id);

-- Увімкнення Row Level Security
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Дозволити читання, створення та оновлення для фронтенду
CREATE POLICY "Allow public select" ON public.reminders
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON public.reminders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON public.reminders
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete" ON public.reminders
    FOR DELETE USING (true);

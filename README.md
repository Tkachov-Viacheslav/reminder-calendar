# 📅 Календар Нагадувань з Telegram Ботом (Netlify + Supabase + Telegram Mini App)

Сучасний інтерактивний веб-календар з плануванням нагадувань, які надсилаються безпосередньо у Telegram бот у визначений час.

Працює як у звичайному браузері, так і у вигляді **Telegram Mini App** (всередині додатку Telegram).

---

## 🚀 Основні можливості

- **Інтерактивний календар:** перегляд місяця, вибір дня, швидкий перехід до поточної дати, категорії подій (Робота, Особисте, Навчання, Здоров’я, Інше).
- **Підтримка Telegram Mini App (TMA):** автоматичне визначення користувача, імені та ID при відкритті всередині Telegram, вібровідгук (Haptic Feedback).
- **Автономні серверні нагадування:** Netlify Scheduled Functions щохвилини перевіряють настання часу подій у базі Supabase і відправляють повідомлення через Telegram Bot API.
- **Підтримка десктопного браузера:** можливість вказати свій Telegram Chat ID вручну та надіслати тестове сповіщення для перевірки.
- **Локальний демо-режим:** сайт повноцінно працює через `localStorage` навіть до підключення бази даних Supabase.

---

## 🛠 Стек технологій

- **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide Icons
- **Database:** Supabase (PostgreSQL)
- **Functions & Hosting:** Netlify (Serverless & Scheduled Functions, Static Hosting)
- **Bot Integration:** Telegram Bot API & Telegram WebApp SDK

---

## 📋 Покрокова інструкція з розгортання

### 1. Створення Telegram Бота
1. У Telegram відкрийте [@BotFather](https://t.me/BotFather) та надішліть команду `/newbot`.
2. Вкажіть назву та username (наприклад, `my_calendar_bot`).
3. Збережіть отриманий токен (наприклад, `7123456789:AAFxxx...`).
4. *(Опціонально для Mini App)* Налаштуйте кнопку меню:
   - Надішліть `/setmenubutton` → оберіть вашого бота → вкажіть URL вашого сайту на Netlify.

---

### 2. Створення бази даних у Supabase
1. Зареєструйтесь на [supabase.com](https://supabase.com) і створіть новий проєкт.
2. Перейдіть у меню **SQL Editor** зліва.
3. Скопіюйте вміст файлу `supabase-schema.sql` (або з вікна інструкцій на сайті), вставте його в редактор і натисніть **Run**:
   ```sql
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

   CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON public.reminders (remind_at, is_sent);
   CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders (user_id);

   ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Allow public select" ON public.reminders FOR SELECT USING (true);
   CREATE POLICY "Allow public insert" ON public.reminders FOR INSERT WITH CHECK (true);
   CREATE POLICY "Allow public update" ON public.reminders FOR UPDATE USING (true) WITH CHECK (true);
   CREATE POLICY "Allow public delete" ON public.reminders FOR DELETE USING (true);
   ```
4. У **Project Settings -> API** скопіюйте:
   - **Project URL**
   - **anon public key**
   - **service_role secret key**

---

### 3. Завантаження на GitHub
Ініціалізуйте Git і завантажте проєкт у свій репозиторій на GitHub:
```bash
git init
git add .
git commit -m "Initial commit: Telegram reminder calendar"
git branch -M main
git remote add origin https://github.com/ВАШ_КОРИСТУВАЧ/ВАШ_РЕПОЗИТОРІЙ.git
git push -u origin main
```

---

### 4. Хостинг на Netlify
1. Перейдіть на [app.netlify.com](https://app.netlify.com/) і натисніть **"Add new site" -> "Import an existing project"**.
2. Виберіть **GitHub** і вкажіть створений репозиторій.
3. Параметри збірки Netlify підтягне автоматично з `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`
4. Перейдіть до **Site configuration -> Environment variables** і додайте 4 змінні:
   - `VITE_SUPABASE_URL` = ваш URL проєкту Supabase
   - `VITE_SUPABASE_ANON_KEY` = ваш anon public ключ
   - `SUPABASE_SERVICE_ROLE_KEY` = ваш service_role secret ключ
   - `TELEGRAM_BOT_TOKEN` = ваш токен бота від @BotFather
5. Натисніть **Deploy site**.

Netlify автоматично щохвилини запускатиме серверний розклад (`check-reminders.mjs`), який перевірятиме базу та надсилатиме повідомлення користувачам у Telegram!

---

## 💻 Локальний запуск для тестування

```bash
# Встановлення залежностей
npm install

# Запуск локального сервера розробки
npm run dev
```

Відкрийте у браузері: `http://localhost:3000`
